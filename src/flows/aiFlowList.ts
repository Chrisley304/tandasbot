import type { TFlow } from "@builderbot/bot/dist/types";
import { BOT_COMMANDS, TANDA_COMMAND_PREFIXES } from "@enums/bot-commands";
import { normalizeTandaName } from "@utils/misc";
import { menuFlow } from "./generalFlow";
import {
    changeTandaPasswordFlow,
    changeTandaPriceFlow,
    getTandasStatusFlow,
    grantTandaPeriodsFlow,
    sendDailyRemindersFlow,
    sendMessageToGroupFlow,
    sendMessageToUserFlow,
    userDebtLookupFlow,
} from "./adminFlow";
import {
    tandaPaymentInfoFlow,
    tandaPaymentEntryFlow,
    tandaRulesFlow,
    tandaStatusFlow,
} from "./tandasFlow";

export interface CommandRoute {
    flow: TFlow;
    selectedTandaName?: string;
}

export const getFlowByCommandName = (
    commandName: string,
): CommandRoute | null => {
    const trimmed = commandName.trim();
    const normalized = normalizeTandaName(trimmed);

    switch (normalized) {
        case BOT_COMMANDS.MENU:
        case BOT_COMMANDS.MENU_WITHOUT_ACCENTS:
        case "menu":
            return { flow: menuFlow };
        case BOT_COMMANDS.PAYMENT_DETAILS:
            return { flow: tandaPaymentInfoFlow };
        case BOT_COMMANDS.SEND_GROUP_MESSAGE:
            return { flow: sendMessageToGroupFlow };
        case BOT_COMMANDS.SEND_CUSTOM_MESSAGE:
            return { flow: sendMessageToUserFlow };
        case BOT_COMMANDS.TANDA_STATUS:
            return { flow: getTandasStatusFlow };
        case BOT_COMMANDS.RESEND_TANDA_REMINDERS:
            return { flow: sendDailyRemindersFlow };
        case BOT_COMMANDS.USER_STATUS:
            return { flow: userDebtLookupFlow };
        case BOT_COMMANDS.GRANT_TANDA_PERIODS:
            return { flow: grantTandaPeriodsFlow };
        case BOT_COMMANDS.CHANGE_TANDA_PRICE:
            return { flow: changeTandaPriceFlow };
        case BOT_COMMANDS.CHANGE_TANDA_PASSWORD:
        case BOT_COMMANDS.CHANGE_TANDA_PASSWORD_WITHOUT_TILDE:
            return { flow: changeTandaPasswordFlow };
        default:
            break;
    }

    if (normalized.startsWith(TANDA_COMMAND_PREFIXES.PAY)) {
        return {
            flow: tandaPaymentEntryFlow,
            selectedTandaName: trimmed.slice(TANDA_COMMAND_PREFIXES.PAY.length).trim(),
        };
    }

    if (normalized.startsWith(TANDA_COMMAND_PREFIXES.MY)) {
        return {
            flow: tandaStatusFlow,
            selectedTandaName: trimmed.slice(TANDA_COMMAND_PREFIXES.MY.length).trim(),
        };
    }

    if (normalized.startsWith(TANDA_COMMAND_PREFIXES.RULES)) {
        return {
            flow: tandaRulesFlow,
            selectedTandaName: trimmed
                .slice(TANDA_COMMAND_PREFIXES.RULES.length)
                .trim(),
        };
    }

    return null;
};
