import { createFlow } from "@builderbot/bot";

import { menuFlow } from "./generalFlow";
import {
    changeTandaPasswordFlow,
    changeTandaPasswordHandler,
    changeTandaPriceFlow,
    changeTandaPriceHandler,
    getTandasStatusFlow,
    messageToGroupHandler,
    sendDailyRemindersFlow,
    sendMessageToGroupFlow,
    sendMessageToUserFlow,
    sendMessageToUserHandler,
    userDebtLookupFlow,
    userDebtLookupHandler,
} from "./adminFlow";
import {
    acceptTermsHandler,
    chrisPaymentInfoFlow,
    tandaPaymentEntryFlow,
    tandaPaymentHandler,
    tandaRulesFlow,
    tandaStatusFlow,
} from "./tandasFlow";
import { aiFlow } from "./aiFlow";
import { idleFlow } from "./idleFlow";

export const flow = createFlow([
    aiFlow,
    idleFlow,
    menuFlow,
    chrisPaymentInfoFlow,
    tandaPaymentEntryFlow,
    tandaPaymentHandler,
    tandaStatusFlow,
    tandaRulesFlow,
    acceptTermsHandler,
    sendMessageToGroupFlow,
    messageToGroupHandler,
    sendMessageToUserFlow,
    sendMessageToUserHandler,
    getTandasStatusFlow,
    sendDailyRemindersFlow,
    userDebtLookupFlow,
    userDebtLookupHandler,
    changeTandaPriceFlow,
    changeTandaPriceHandler,
    changeTandaPasswordFlow,
    changeTandaPasswordHandler,
]);
