import { addKeyword, EVENTS } from "@builderbot/bot";
import type { BotContext, TFlow } from "@builderbot/bot/dist/types";
import { IDLE_TIMEOUT_MESSAGE } from "@constants/messages";
import logger from "@utils/logger";

export const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const timers = new Map<string, NodeJS.Timeout>();

export const idleFlow = addKeyword(EVENTS.ACTION).addAction(
    async (ctx, { endFlow, state }) => {
        stopIdle(ctx);
        try {
            await state.clear();
        } catch (error) {
            logger.debug(`Could not clear state on idle timeout: ${String(error)}`);
        }
        return endFlow(IDLE_TIMEOUT_MESSAGE);
    },
);

export const startIdle = (
    ctx: BotContext,
    gotoFlow: (flow: TFlow) => Promise<void>,
    ms: number = IDLE_TIMEOUT_MS,
): void => {
    stopIdle(ctx);
    const timer = setTimeout(() => {
        timers.delete(ctx.from);
        logger.info(`Idle timeout reached for user ${ctx.from}`);
        void gotoFlow(idleFlow);
    }, ms);
    timers.set(ctx.from, timer);
};

export const resetIdle = (
    ctx: BotContext,
    gotoFlow: (flow: TFlow) => Promise<void>,
    ms: number = IDLE_TIMEOUT_MS,
): void => {
    startIdle(ctx, gotoFlow, ms);
};

export const stopIdle = (ctx: BotContext): void => {
    const existing = timers.get(ctx.from);
    if (existing) {
        clearTimeout(existing);
        timers.delete(ctx.from);
    }
};
