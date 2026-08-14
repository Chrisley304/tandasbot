import type { Deptor } from "@custom-types/debtors";

import { USER_GROUPS } from "@enums/users";
import { User } from "@custom-types/notion/usersDB";
import { getUsersFromGroup } from "./notion/usersDB";
import { provider } from "@config/provider";
import { Tanda } from "@custom-types/notion/tandasDB";
import { textToPascalCase, toTitleCase } from "./misc";
import { Message } from "@custom-types/messages";
import logger from "./logger";

export const isUserAllowed = (
    user: User | null,
    requiredRoles: USER_GROUPS[],
): boolean => {
    if (!user) {
        return false;
    }

    if (requiredRoles.includes(USER_GROUPS.ALL) && user.groups.length > 0) {
        return true;
    }

    return requiredRoles.some((role) => user.groups.includes(role));
};

export const sendMessageToUserGroup = async (
    groupName: string,
    message: string,
): Promise<void> => {
    try {
        const users = await getUsersFromGroup(groupName);

        users.forEach((user) => {
            const userPhone = "+" + user.phone;
            provider.sendMessage(userPhone, message, {});
        });
    } catch (error) {
        logger.error(
            `Error al enviar mensaje a grupo de usuarios ${groupName}: ${String(
                error,
            )}`,
        );
    }
};

export const sendMessagesToUser = async (
    user: User,
    messages: Message[],
): Promise<void> => {
    try {
        const userPhone = "+" + user.phone;
        await messages.forEach(async (message) => {
            if (!message.type || message.type === "text") {
                await provider.sendMessage(userPhone, message.body, {});
            } else if (message.type === "image") {
                await provider.sendImage(
                    `${user.phone}@s.whatsapp.net`,
                    message.body,
                    message.alt || "",
                );
            }
        });
    } catch (error) {
        logger.error(
            `Error al enviar mensaje a ${user.name}: ${String(error)}`,
        );
    }
};

export const sendMessagesToProvidedUsers = (
    users: User[],
    messages: string[],
): void => {
    try {
        users.forEach((user) => {
            if (user.phone.length < 11) {
                return;
            }

            const userPhone = "+" + user.phone;
            messages.forEach((message) => {
                provider.sendMessage(userPhone, message, {});
            });
        });
    } catch (error) {
        logger.error(`Error al enviar mensaje a usuario: ${String(error)}`);
    }
};

export const sendReminderToDebtors = async (
    debtors: Deptor[],
    tanda: Tanda,
    reminderDay: number,
) => {
    logger.info(`Sending messages to ${tanda.name} debtors`);

    debtors.forEach((debtor) => {
        const messages: Message[] = [];

        if (tanda.suscriptionType === "monthly") {
            switch (reminderDay) {
                case 5:
                    messages.push(
                        {
                            body: `Hola ${
                                debtor.user.name
                            } 👋🏼! Aca Chrisbot recordandote que esta semana debes pagar tu parte de ${toTitleCase(
                                tanda.name,
                            )} (*${tanda.costPerUser} pesos* 😉)`,
                        },
                        {
                            body: `👀 Psst: Recuerda enviarme por aquí tu comprobante enviando *pagar ${tanda.name}* para registrar tu pago correctamente 🤩`,
                        },
                    );

                    break;

                case 3:
                    messages.push(
                        {
                            body: `Hola de nuevo 😅, te recuerdo que en 3 días debes pagar tu parte de ${toTitleCase(
                                tanda.name,
                            )} (psst: son *${tanda.costPerUser} pesos* 😉)`,
                        },
                        {
                            body: "Recuerda que puedes enviar `datos de pago` para que te envíe mis datos de pago de pago 🤓",
                        },
                    );
                    if (debtor.missingPayments > 1) {
                        messages.push({
                            body: `También te recuerdo que tienes ${
                                debtor.missingPayments
                            } pagos pendientes de ${toTitleCase(
                                tanda.name,
                            )} 😵‍💫`,
                        });
                    }

                    break;

                case 1:
                    messages.push(
                        {
                            body: `Jeloou 👀... Mañana es la fecha de pago de de ${toTitleCase(
                                tanda.name,
                            )} por favor paga tu parte de *${
                                tanda.costPerUser
                            } pesos* 🥹`,
                        },
                        {
                            body: `Si tienes alguna situación que te impida realizar el pago a tiempo, por favor házmelo saber a mi numero personal 🙏🏼`,
                        },
                    );
                    break;

                case 0:
                    messages.push(
                        {
                            body: `🚨 Hoy es la fecha de pago de ${toTitleCase(
                                tanda.name,
                            )}!!! Recuerda pagar tu parte de *${
                                tanda.costPerUser
                            } pesos* 💨`,
                        },
                        {
                            body: `Evita la eliminación de tu cuenta pagando a tiempo 😬`,
                        },
                    );

                    break;

                case -2:
                    messages.push(
                        {
                            body: `Hola! Hace 2 días fue la fecha de pago de *${toTitleCase(
                                tanda.name,
                            )}* y no tengo registro de tu pago 😕. Si aún no lo has realizado o registrado con *pagar ${
                                tanda.name
                            }* hazlo ahora y evita la eliminación de tu cuenta!`,
                        },
                        {
                            body: `Si ya registraste tu pago, *por favor enviame un mensaje a mi numero personal para verificarlo* 🧐`,
                        },
                    );
                    if (debtor.missingPayments > 1) {
                        messages.push({
                            body: `También te recuerdo que tienes ${
                                debtor.missingPayments
                            } pagos pendientes de ${toTitleCase(
                                tanda.name,
                            )} 😵‍💫`,
                        });
                    }

                    break;
                default:
                    break;
            }
        } else if (tanda.suscriptionType === "annual") {
            switch (reminderDay) {
                case 30:
                    messages.push(
                        {
                            body: `Hola ${
                                debtor.user.name
                            } 👋🏼! Un tiempo sin hablar contigo, soy Chrisbot recordandote que este mes debes pagar tu parte *anual* de ${toTitleCase(
                                tanda.name,
                            )} (*${tanda.costPerUser} pesos* 😉)`,
                        },
                        {
                            body: `👀 Psst: Recuerda enviarme por aquí tu comprobante enviando *pagar ${tanda.name}* para registrar tu pago correctamente 🤩`,
                        },
                    );
                    break;

                case 15:
                    messages.push(
                        {
                            body: `Hola de nuevo ${
                                debtor.user.name
                            } 😅, te recuerdo que en 15 días debes pagar tu parte de ${toTitleCase(
                                tanda.name,
                            )} (psst: son *${tanda.costPerUser} pesos* 😉)`,
                        },
                        {
                            body: "Recuerda que puedes enviar `datos de pago` para que te envíe mis datos de pago de pago 🤓",
                        },
                    );
                    break;

                case 7:
                    messages.push(
                        {
                            body: `Jeje otra vez yo 😅, te recuerdo que en una semana debes pagar tu parte de ${toTitleCase(
                                tanda.name,
                            )} tu parte a pagar es de *${
                                tanda.costPerUser
                            } pesos* 💵`,
                        },
                        {
                            body: "Si cambiaste de opinión y no quieres seguir en el servicio, por favor házmelo saber a mi numero personal 🤓",
                        },
                    );
                    break;

                case 1:
                    messages.push(
                        {
                            body: `Jeloou 👀... Mañana es la fecha de pago de de ${toTitleCase(
                                tanda.name,
                            )} por favor paga tu parte de *${
                                tanda.costPerUser
                            } pesos* 🥹`,
                        },
                        {
                            body: `Si tienes alguna situación que te impida realizar el pago a tiempo, por favor házmelo saber a mi numero personal 🙏🏼`,
                        },
                    );
                    break;
                case 0:
                    messages.push(
                        {
                            body: `🚨 Hoy es la fecha de pago de ${toTitleCase(
                                tanda.name,
                            )}!!! Recuerda pagar tu parte de *${
                                tanda.costPerUser
                            } pesos* 💨`,
                        },
                        {
                            body: `Evita la eliminación de tu cuenta pagando a tiempo 😬`,
                        },
                    );
                    break;
                case -2:
                    messages.push(
                        {
                            body: `Hola! Hace 2 días fue la fecha de pago de *${toTitleCase(
                                tanda.name,
                            )}* y no tengo registro de tu pago 😕. Si aún no lo has realizado o registrado con *pagar ${
                                tanda.name
                            }* hazlo ahora y evita la eliminación de tu cuenta!`,
                        },
                        {
                            body: `Si ya registraste tu pago, *por favor enviame un mensaje a mi numero personal para verificarlo* 🧐`,
                        },
                    );
                    break;
                default:
                    break;
            }
        }

        if (messages.length > 0) {
            sendMessagesToUser(debtor.user, messages);
            logger.info(`Messages sent to ${debtor.user.name}`);
        }
    });

    logger.info(`Messages sent to ${tanda.name} debtors`);
};

export const hasUserAcceptedTandaTerms = (
    tanda: string,
    user: User,
): boolean => {
    return user[`hasAccepted${textToPascalCase(tanda)}Terms`] || false;
};
