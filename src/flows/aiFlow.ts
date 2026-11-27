import { addKeyword, EVENTS } from "@builderbot/bot";
import type { BotContext } from "@builderbot/bot/dist/types";
import { JsonFileDB as Database } from "@builderbot/database-json";
import { BaileysProvider as Provider } from "@builderbot/provider-baileys";
import dotenv from "dotenv";

import {
    AI_ERROR_MESSAGE,
    GENERIC_ERROR_MESSAGE,
    GENERIC_NOT_REGISTERED_MESSAGE,
} from "@constants/messages";
import type { AIResponse } from "@custom-types/aiResponse";
import { aiModel, buildAiModelConfig } from "@config/aiModel";
import { getActiveTandas } from "@utils/notion/tandasDB";
import {
    createMessageQueue,
    resolveUserFromContext,
    withTyping,
} from "@utils/flowHelpers";
import { isUserAllowed } from "@utils/users";
import logger from "@utils/logger";
import { getFlowByCommandName } from "./aiFlowList";

dotenv.config();

const enqueueMessage = createMessageQueue(1500);

const processAiMessage = async (
    ctx: BotContext,
    combinedBody: string,
    helpers: {
        flowDynamic: (msg: string | string[]) => Promise<void>;
        provider: Provider;
        gotoFlow: (flow: any) => Promise<void>;
        state: { update: (data: Record<string, unknown>) => Promise<void> };
    },
) => {
    const { flowDynamic, provider, gotoFlow, state } = helpers;

    try {
        const userInfo = await resolveUserFromContext(ctx);

        if (!isUserAllowed(userInfo)) {
            await flowDynamic(GENERIC_NOT_REGISTERED_MESSAGE);
            return;
        }

        try {
            await withTyping(ctx, provider, async () => {
                logger.info(
                    `Answering message with AI from user ${userInfo!.name}: ${combinedBody}`,
                );

                const activeTandas = await getActiveTandas();
                const userTandas = activeTandas
                    .filter((t) => userInfo!.tandaIds.includes(t.id))
                    .map((t) => t.name);

                const response = await aiModel.models.generateContent({
                    model: process.env.GEMINI_MODEL_NAME,
                    contents: JSON.stringify({
                        userName: userInfo!.name,
                        isAdmin: userInfo!.isAdmin,
                        userTandas,
                        userMessage: combinedBody,
                    }),
                    config: buildAiModelConfig(activeTandas),
                });

                const aiResponse: AIResponse = JSON.parse(response.text);
                logger.info(
                    `AI response for user ${userInfo!.name}: ${aiResponse.messageToUser}`,
                );

                if (aiResponse.messageToUser) {
                    await flowDynamic(aiResponse.messageToUser);
                }

                if (aiResponse.startCommand) {
                    logger.info(
                        `AI redirecting user ${userInfo!.name} to: ${aiResponse.startCommand}`,
                    );
                    const route = getFlowByCommandName(aiResponse.startCommand);

                    if (route) {
                        if (route.selectedTandaName) {
                            await state.update({
                                selectedTandaName: route.selectedTandaName,
                            });
                        }
                        await gotoFlow(route.flow);
                    }
                }
            });
        } catch (error) {
            logger.error(error);
            await flowDynamic(AI_ERROR_MESSAGE);
        }
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
};

export const aiFlow = addKeyword<Provider, Database>([
    EVENTS.WELCOME,
    EVENTS.DOCUMENT,
    EVENTS.MEDIA,
]).addAction(async (ctx, { flowDynamic, provider, gotoFlow, state }) => {
    const isMedia = Boolean(
        ctx.message?.imageMessage || ctx.message?.documentMessage,
    );

    if (isMedia) {
        await processAiMessage(ctx, ctx.body || "[Archivo/Comprobante enviado]", {
            flowDynamic,
            provider,
            gotoFlow,
            state,
        });
        return;
    }

    enqueueMessage(ctx, async (combinedBody, latestCtx) => {
        await processAiMessage(latestCtx, combinedBody, {
            flowDynamic,
            provider,
            gotoFlow,
            state,
        });
    });
});
