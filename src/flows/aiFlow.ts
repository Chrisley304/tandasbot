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
                    {
                        event: "ai.request.started",
                        userId: userInfo!.id,
                        userName: userInfo!.name,
                        messageLength: combinedBody.length,
                    },
                    "Processing user request with AI",
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
                    {
                        event: "ai.request.completed",
                        userId: userInfo!.id,
                        hasMessage: Boolean(aiResponse.messageToUser),
                        startCommand: aiResponse.startCommand || undefined,
                    },
                    "AI response generated",
                );

                if (aiResponse.messageToUser) {
                    await flowDynamic(aiResponse.messageToUser);
                }

                if (aiResponse.startCommand) {
                    const route = getFlowByCommandName(aiResponse.startCommand);

                    if (route) {
                        logger.info(
                            {
                                event: "ai.route.resolved",
                                userId: userInfo!.id,
                                startCommand: aiResponse.startCommand,
                                selectedTandaName: route.selectedTandaName,
                            },
                            "Routing AI request to bot flow",
                        );
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
            logger.error(
                { err: error, event: "ai.request.failed" },
                "AI request failed",
            );
            await flowDynamic(AI_ERROR_MESSAGE);
        }
    } catch (error) {
        logger.error(
            { err: error, event: "ai.request.unhandled" },
            "Unhandled error while processing AI request",
        );
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
