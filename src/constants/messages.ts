export const GENERIC_ERROR_MESSAGE = [
    "Disculpa sucedio un error al intentar interactuar contigo 😕.",
    "Si esto persiste, contacta al administrador de tu tanda 🙏🏼",
];

export const AI_ERROR_MESSAGE = [
    "Disculpa, tuve un problema al generar una respuesta para ti con IA ✨.",
    "Si esto persiste, intenta usando los comandos de `menú` directamente o contacta al administrador de tu tanda 🙏🏼",
];

export const GENERIC_NOT_REGISTERED_MESSAGE = [
    "Disculpa, debes estar *autorizado* para interactuar contigo 😕.",
    "Si crees que es un error, contacta al administrador de tu tanda 👀",
];

export const GENERIC_NOT_AUTHORIZED_MESSAGE = [
    "Disculpa, no tienes permisos para realizar esta acción 😕.",
    "Si crees que es un error, contacta al administrador de tu tanda 👀",
];

export const CANCEL_INSTRUCTION =
    '_(Escribe "cancelar" en cualquier momento para cancelar la operación)_';

export const OPERATION_CANCELLED_MESSAGE =
    "❌ Operación cancelada. Si necesitas algo más, escríbeme o envía `menú`.";

export const IDLE_TIMEOUT_MESSAGE =
    "⏳ Se agotó el tiempo de espera (5 minutos) y se cerró la operación actual. Cuando quieras continuar, vuelve a enviarme un mensaje.";

/**
 * Returns a list of messages to be sent when a user has not accepted the terms and conditions of a tanda.
 */
export const GENERIC_USER_HAS_NOT_ACCEPTED_TERMS_MESSAGE = (
    tandaName: string,
) => [
    "Disculpa, debes aceptar el *reglamento* para poder interactuar conmigo 😕.",
    `Escribe \`reglamento ${tandaName.toLowerCase()}\` para leer y aceptar el reglamento. Si crees que es un error, contacta al administrador de tu tanda 👀`,
];
