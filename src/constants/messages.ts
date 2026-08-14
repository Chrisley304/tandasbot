export const GENERIC_ERROR_MESSAGE = [
    "Disculpa sucedio un error al intentar interactuar contigo 😕.",
    "Si esto persiste, por favor envíame un mensaje a mi numero personal 🙏🏼",
];

export const AI_ERROR_MESSAGE = [
    "Disculpa, tuve un problema al generar una respuesta para ti con IA ✨.",
    "Si esto persiste, intenta usando los comandos de `menú` directamente o por favor envíame un mensaje a mi numero personal 🙏🏼",
];

export const GENERIC_NOT_REGISTERED_MESSAGE = [
    "Disculpa, debes estar *autorizado* para interactuar contigo 😕.",
    "Si crees que es un error, envíame un mensaje a mi numero personal 👀",
];

export const GENERIC_NOT_AUTHORIZED_MESSAGE = [
    "Disculpa, no tienes permisos para realizar esta acción 😕.",
    "Si crees que es un error, envíame un mensaje a mi numero personal 👀",
];

/**
 * Returns a list of messages to be sent when a user has not accepted the terms and conditions of a tanda.
 * @param tandaName - The name of the tanda where the user has not accepted the terms and conditions.
 */
export const GENERIC_USER_HAS_NOT_ACCEPTED_TERMS_MESSAGE = (
    tandaName: string,
) => [
    "Disculpa, debes aceptar el *reglamento* para poder interactuar conmigo 😕.",
    `Escribe \`reglamento ${tandaName}\` para leer y aceptar el reglamento. Si crees que es un error, envíame un mensaje a mi numero personal 👀`,
];
