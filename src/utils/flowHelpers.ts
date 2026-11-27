import type { BotContext } from "@builderbot/bot/dist/types";
import type { BaileysProvider as Provider } from "@builderbot/provider-baileys";
import type { User } from "@custom-types/notion/usersDB";

import { CANCEL_INSTRUCTION } from "@constants/messages";
import { getUserFromPhone } from "@utils/notion/usersDB";
import { getCleanPhoneNumber } from "@utils/whatsapp";
import logger from "./logger";

/**
 * Resolves a registered Notion User from BuilderBot context.
 */
export const resolveUserFromContext = async (
    ctx: BotContext,
): Promise<User | null> => {
    const messagePhoneNumber = ctx.key?.remoteJid
        ? getCleanPhoneNumber(ctx.key.remoteJid)
        : "";
    const userFrom = ctx.from || "";

    return (
        (userFrom ? await getUserFromPhone(userFrom) : null) ||
        (messagePhoneNumber ? await getUserFromPhone(messagePhoneNumber) : null)
    );
};

/**
 * Wraps an async operation showing WhatsApp "typing..." ("composing") presence
 * and always resetting to "paused" in finally.
 */
export const withTyping = async <T>(
    ctx: BotContext,
    provider: Provider,
    fn: () => Promise<T>,
): Promise<T> => {
    const jid = ctx.key?.remoteJid;
    const sendPresence = async (presence: "composing" | "paused") => {
        if (!jid || !provider?.vendor?.sendPresenceUpdate) {
            return;
        }

        try {
            await provider.vendor.sendPresenceUpdate(presence, jid);
        } catch (error) {
            logger.debug(
                `Could not send ${presence} presence: ${String(error)}`,
            );
        }
    };

    await sendPresence("composing");
    // WhatsApp clears the composing indicator after a few seconds. Refresh it
    // while lengthy operations (such as the full tanda-status report) run.
    const typingHeartbeat = setInterval(() => {
        void sendPresence("composing");
    }, 8_000);

    try {
        return await fn();
    } finally {
        clearInterval(typingHeartbeat);
        await sendPresence("paused");
    }
};

/**
 * Checks if the user typed "cancelar".
 */
export const isCancelCommand = (text?: string): boolean => {
    if (!text) return false;
    return text.trim().toLowerCase() === "cancelar";
};

/**
 * Appends the cancel instruction after user prompt instructions.
 */
export const withCancelInstruction = (instruction: string): string =>
    `${instruction}\n\n${CANCEL_INSTRUCTION}`;

interface QueuedMessage {
    text: string;
    ctx: BotContext;
}

interface UserQueue {
    messages: QueuedMessage[];
    timer: NodeJS.Timeout | null;
}

/**
 * Debounced per-user message queue (Fast Entries pattern) to merge rapid consecutive messages.
 */
export const createMessageQueue = (gapMilliseconds = 1500) => {
    const queues = new Map<string, UserQueue>();

    return (
        ctx: BotContext,
        onFlush: (combinedBody: string, latestCtx: BotContext) => Promise<void>,
    ): void => {
        const from = ctx.from;
        const text = (ctx.body || "").trim();

        if (!from) {
            return;
        }

        const existing = queues.get(from) || { messages: [], timer: null };
        if (existing.timer) {
            clearTimeout(existing.timer);
        }

        existing.messages.push({ text, ctx });

        existing.timer = setTimeout(async () => {
            const current = queues.get(from);
            if (!current) return;
            queues.delete(from);

            const combinedBody = current.messages
                .map((m) => m.text)
                .filter(Boolean)
                .join(" ");
            const latestCtx = current.messages[current.messages.length - 1].ctx;

            try {
                await onFlush(combinedBody, latestCtx);
            } catch (error) {
                logger.error(`Error flushing message queue for ${from}: ${String(error)}`);
            }
        }, gapMilliseconds);

        queues.set(from, existing);
    };
};
