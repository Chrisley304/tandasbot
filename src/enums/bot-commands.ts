export enum BOT_COMMANDS {
    // All users
    PAYMENT_DETAILS = "datos de pago",
    MENU = "menú",
    MENU_WITHOUT_ACCENTS = "menu",

    // Admin
    SEND_GROUP_MESSAGE = "mensaje a grupo",
    SEND_CUSTOM_MESSAGE = "mensaje personalizado",
    TANDA_STATUS = "estatus tandas",
    RESEND_TANDA_REMINDERS = "reenviar recordatorios tandas",
    USER_DEBTS = "adeudos usuario",
    CHANGE_TANDA_PRICE = "cambiar precio tanda",
    CHANGE_TANDA_PASSWORD = "cambiar contraseña tanda",
    CHANGE_TANDA_PASSWORD_WITHOUT_TILDE = "cambiar contrasena tanda",
}

export const TANDA_COMMAND_PREFIXES = {
    PAY: "pagar ",
    MY: "mi ",
    RULES: "reglamento ",
} as const;
