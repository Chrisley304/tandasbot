import { addKeyword, EVENTS } from "@builderbot/bot";
import { JsonFileDB as Database } from "@builderbot/database-json";
import { BaileysProvider as Provider } from "@builderbot/provider-baileys";
import dotenv from "dotenv";

import {
    AI_ERROR_MESSAGE,
    GENERIC_ERROR_MESSAGE,
    GENERIC_NOT_REGISTERED_MESSAGE,
} from "@constants/messages";
import { USER_GROUPS } from "@enums/users";
import { getUserFromPhone } from "@utils/notion/usersDB";
import { isUserAllowed } from "@utils/users";
import logger from "@utils/logger";
import { getCleanPhoneNumber } from "@utils/whatsapp";
import { aiModel, aiModelConfig } from "@config/aiModel";
import { AIResponse } from "@custom-types/aiResponse";
import { getFlowByCommandName } from "./aiFlowList";

dotenv.config();

export const aiFlow = addKeyword<Provider, Database>([
    EVENTS.WELCOME,
    EVENTS.DOCUMENT,
    EVENTS.MEDIA,
]).addAction(async (ctx, { flowDynamic, provider, gotoFlow }) => {
    try {
        const messagePhoneNumber = getCleanPhoneNumber(ctx.key.remoteJid!);
        const userFrom = ctx.from;
        const userInfo =
            (await getUserFromPhone(userFrom)) ||
            (await getUserFromPhone(messagePhoneNumber));

        if (isUserAllowed(userInfo, [USER_GROUPS.ALL])) {
            try {
                logger.info(
                    `Answering message with AI from user ${userInfo.name}: ${ctx.body}`,
                );
                await provider.vendor.sendPresenceUpdate(
                    "composing",
                    ctx.key.remoteJid,
                );

                const response = await aiModel.models.generateContent({
                    model: process.env.GEMINI_MODEL_NAME,
                    contents: JSON.stringify({
                        userName: userInfo.name,
                        userGroups: userInfo.groups,
                        userMessage: ctx.body,
                    }),
                    config: aiModelConfig,
                });

                const aiResponse: AIResponse = JSON.parse(response.text);
                logger.info(
                    `AI response for user ${userInfo.name}: ${aiResponse.messageToUser}`,
                );
                await flowDynamic(aiResponse.messageToUser);

                if (aiResponse.startCommand) {
                    logger.info(
                        `AI redirecting user ${userInfo.name} to: ${aiResponse.startCommand}`,
                    );
                    const commandFlow = getFlowByCommandName(
                        aiResponse.startCommand,
                    );

                    if (commandFlow) {
                        return gotoFlow(commandFlow);
                    }
                }
            } catch (error) {
                logger.error(error);
                await flowDynamic(AI_ERROR_MESSAGE);
            }
        } else {
            await flowDynamic(GENERIC_NOT_REGISTERED_MESSAGE);
        }
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});
