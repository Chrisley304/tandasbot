import { addKeyword } from "@builderbot/bot";
import { JsonFileDB as Database } from "@builderbot/database-json";
import { BaileysProvider as Provider } from "@builderbot/provider-baileys";

import {
    GENERIC_ERROR_MESSAGE,
    GENERIC_NOT_REGISTERED_MESSAGE,
} from "@constants/messages";
import { generateUserMenuLines } from "@constants/menu";
import { BOT_COMMANDS } from "@enums/bot-commands";
import { getActiveTandas } from "@utils/notion/tandasDB";
import { resolveUserFromContext, withTyping } from "@utils/flowHelpers";
import { isUserAllowed } from "@utils/users";
import logger from "@utils/logger";

export const menuFlow = addKeyword<Provider, Database>(
    [BOT_COMMANDS.MENU, BOT_COMMANDS.MENU_WITHOUT_ACCENTS],
    {},
).addAction(async (ctx, { flowDynamic, provider }) => {
    try {
        await withTyping(ctx, provider, async () => {
            const userInfo = await resolveUserFromContext(ctx);

            if (isUserAllowed(userInfo)) {
                const activeTandas = await getActiveTandas();
                const availableCommands = generateUserMenuLines(
                    userInfo!,
                    activeTandas,
                );
                await flowDynamic(
                    "📋 *Menú*\n" + availableCommands.join("\n"),
                );
            } else {
                await flowDynamic(GENERIC_NOT_REGISTERED_MESSAGE);
            }
        });
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});
