import { addKeyword, EVENTS } from "@builderbot/bot";
import { JsonFileDB as Database } from "@builderbot/database-json";
import { BaileysProvider as Provider } from "@builderbot/provider-baileys";

import {
    GENERIC_ERROR_MESSAGE,
    GENERIC_NOT_REGISTERED_MESSAGE,
} from "@constants/messages";
import { USER_GROUPS } from "@enums/users";
import { getUserFromPhone } from "@utils/notion/usersDB";
import { isUserAllowed } from "@utils/users";
import logger from "@utils/logger";
import { getCleanPhoneNumber } from "@utils/whatsapp";
import { userMenuOptions } from "@constants/menu";
import { BOT_COMMANDS } from "@enums/bot-commands";

export const menuFlow = addKeyword<Provider, Database>(
    [BOT_COMMANDS.MENU, BOT_COMMANDS.MENU_WITHOUT_ACCENTS],
    {},
).addAction(async (ctx, { flowDynamic }) => {
    try {
        const messagePhoneNumber = getCleanPhoneNumber(ctx.key.remoteJid!);
        const userFrom = ctx.from;
        const userInfo =
            (await getUserFromPhone(userFrom)) ||
            (await getUserFromPhone(messagePhoneNumber));
        const availableCommands: string[] = [];

        if (isUserAllowed(userInfo, [USER_GROUPS.ALL])) {
            // All user options
            userMenuOptions[USER_GROUPS.ALL].forEach((command) => {
                availableCommands.push(command);
            });

            userInfo.groups.forEach((userGroup) => {
                if (userMenuOptions[userGroup]) {
                    userMenuOptions[userGroup].forEach((command) => {
                        availableCommands.push(command);
                    });
                }
            });

            await flowDynamic("📋 *Menú*\n" + availableCommands.join("\n"));
        } else {
            await flowDynamic(GENERIC_NOT_REGISTERED_MESSAGE);
        }
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});
