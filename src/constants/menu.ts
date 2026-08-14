import { USER_GROUPS } from "@enums/users";

export const userMenuOptions = {
    [USER_GROUPS.ADMIN]: [
        "- `mensaje a grupo` - Envia un mensaje a un grupo de usuarios 📬",
        "- `mensaje personalizado` - Envia un mensaje personalizado a un usuario 📩",
        '- `estatus tandas` - Muestra el estatus de las "tandas" 💸',
        "- `reenviar recordatorios tandas` - Reenvia el recordatorio diario de las tandas a los usuarios 📢",
    ],
    [USER_GROUPS.ALL]: ["- `datos de pago` - Mostrar mis datos de pago 📄"],
    [USER_GROUPS.SPOTIFY]: [
        "- `pagar spotify` - Paga tu parte de Spotify 🎧",
        "- `mi spotify` - Muestra tus pagos realizados o pendientes de tu tanda de Spotify 📆",
        "- `reglamento spotify` - Muestra el reglamento de la tanda de Spotify 📜",
    ],
    [USER_GROUPS.MAX]: [
        "- `pagar hbo max` - Paga tu parte de HBO Max 🍿",
        "- `mi hbo max` - Muestra tus pagos realizados o pendientes de tu tanda de HBO Max 📆",
        "- `reglamento hbo max` - Muestra el reglamento de la tanda de HBO Max 📜",
    ],
    [USER_GROUPS.YOUTUBE_PREMIUM]: [
        "- `pagar youtube` - Paga tu parte de Youtube Premium 🎥",
        "- `mi youtube` - Muestra tus pagos realizados o pendientes de tu tanda de Youtube Premium 📆",
        "- `reglamento youtube premium` - Muestra el reglamento de la tanda de Youtube Premium 📜",
    ],
    [USER_GROUPS.AMAZON_PRIME]: [
        "- `pagar amazon` - Paga tu parte de Amazon Prime 📦",
        "- `mi amazon` - Muestra tus pagos realizados o pendientes de tu tanda de Amazon Prime 📆",
        "- `reglamento amazon prime` - Muestra el reglamento de la tanda de Amazon 📜",
    ],
    [USER_GROUPS.FAMILY]: [],
};
