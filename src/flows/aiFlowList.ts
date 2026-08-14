import { menuFlow } from "./generalFlow";
import {
    sendMessageToGroupFlow,
    getTandasStatusFlow,
    sendMessageToUserFlow,
    sendDailyRemindersFlow,
} from "./adminFlow";
import {
    amazonPrimeStatusFlow,
    chrisPaymentInfoFlow,
    maxStatusFlow,
    registerSpotifyPayment,
    spotifyStatusFlow,
    registerMaxPayment,
    spotifyRulesFlow,
    maxRulesFlow,
    amazonPrimeRulesFlow,
    registerAmazonPayment,
    youtubeRulesFlow,
    youtubePremiumStatusFlow,
    registerYoutubePremiumPayment,
} from "./tandasFlow";
import { BOT_COMMANDS } from "@enums/bot-commands";

export const getFlowByCommandName = (commandName: string) => {
    switch (commandName) {
        // All users
        case BOT_COMMANDS.MENU:
        case BOT_COMMANDS.MENU_WITHOUT_ACCENTS:
            return menuFlow;
        case BOT_COMMANDS.PAYMENT_DETAILS:
            return chrisPaymentInfoFlow;

        // Admin
        case BOT_COMMANDS.SEND_GROUP_MESSAGE:
            return sendMessageToGroupFlow;
        case BOT_COMMANDS.SEND_CUSTOM_MESSAGE:
            return sendMessageToUserFlow;
        case BOT_COMMANDS.TANDA_STATUS:
            return getTandasStatusFlow;

        case BOT_COMMANDS.RESEND_TANDA_REMINDERS:
            return sendDailyRemindersFlow;

        // Spotify
        case BOT_COMMANDS.PAY_SPOTIFY:
            return registerSpotifyPayment;
        case BOT_COMMANDS.MY_SPOTIFY:
            return spotifyStatusFlow;
        case BOT_COMMANDS.SPOTIFY_RULES:
            return spotifyRulesFlow;

        // HBO Max
        case BOT_COMMANDS.PAY_HBO_MAX:
            return registerMaxPayment;
        case BOT_COMMANDS.MY_HBO_MAX:
            return maxStatusFlow;
        case BOT_COMMANDS.HBO_MAX_RULES:
            return maxRulesFlow;

        // YouTube Premium
        case BOT_COMMANDS.PAY_YOUTUBE:
            return registerYoutubePremiumPayment;
        case BOT_COMMANDS.MY_YOUTUBE:
            return youtubePremiumStatusFlow;
        case BOT_COMMANDS.YOUTUBE_PREMIUM_RULES:
            return youtubeRulesFlow;

        // Amazon Prime
        case BOT_COMMANDS.PAY_AMAZON:
            return registerAmazonPayment;
        case BOT_COMMANDS.MY_AMAZON:
            return amazonPrimeStatusFlow;
        case BOT_COMMANDS.AMAZON_PRIME_RULES:
            return amazonPrimeRulesFlow;

        default:
            return null;
    }
};
