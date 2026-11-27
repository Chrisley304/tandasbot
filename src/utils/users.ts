import type { Deptor } from "@custom-types/debtors";
import type { Message } from "@custom-types/messages";
import type { Tanda } from "@custom-types/notion/tandasDB";
import type { User } from "@custom-types/notion/usersDB";

import { provider } from "@config/provider";
import { SUSCRIPTION_TYPES } from "@enums/suscriptions";
import { getUserTandaLegal } from "./notion/legalsDB";
import { getActiveTandas, getTandaByName } from "./notion/tandasDB";
import { getAdminUsers, getUsersByTandaId } from "./notion/usersDB";
import { normalizeTandaName, pesosFormatter, toTitleCase } from "./misc";
import logger from "./logger";

const SUSPENSION_WARNING =
    "⚠️ Recuerda que dejar de pagar resultará en la *suspensión definitiva* de tu servicio.";

export const isUserAllowed = (
    user: User | null,
    options?: { requireAdmin?: boolean; tandaId?: string },
): boolean => {
    if (!user) {
        return false;
    }

    if (options?.requireAdmin) {
        return user.isAdmin;
    }

    if (options?.tandaId) {
        return user.isAdmin || user.tandaIds.includes(options.tandaId);
    }

    return user.isAdmin || user.tandaIds.length > 0;
};

export const sendMessagesToUser = async (
    user: User,
    messages: Message[],
): Promise<void> => {
    try {
        if (!user.phone || user.phone.length < 10) {
            logger.warn(`Skipping message to ${user.name}: invalid phone`);
            return;
        }

        const userPhone = "+" + user.phone;
        for (const message of messages) {
            if (!message.type || message.type === "text") {
                await provider.sendMessage(userPhone, message.body, {});
            } else if (message.type === "image") {
                await provider.sendImage(
                    `${user.phone}@s.whatsapp.net`,
                    message.body,
                    message.alt || "",
                );
            }
        }
    } catch (error) {
        logger.error(
            `Error al enviar mensaje a ${user.name}: ${String(error)}`,
        );
    }
};

export const sendMessagesToAdmins = async (
    messages: Message[],
): Promise<void> => {
    try {
        const admins = await getAdminUsers();
        if (admins.length === 0) {
            logger.warn(
                'No users with "Admin?" = true found in Notion; skipping admin notification.',
            );
            return;
        }

        for (const admin of admins) {
            await sendMessagesToUser(admin, messages);
        }
    } catch (error) {
        logger.error(`Error al enviar mensaje a admins: ${String(error)}`);
    }
};

export const sendMessageToTandaGroup = async (
    targetGroupName: string,
    message: string,
): Promise<{ sentCount: number; targetLabel: string }> => {
    const normalized = normalizeTandaName(targetGroupName);

    if (normalized === "todos") {
        const activeTandas = await getActiveTandas();
        const uniqueUsers = new Map<string, User>();

        for (const tanda of activeTandas) {
            const members = await getUsersByTandaId(tanda.id);
            for (const member of members) {
                uniqueUsers.set(member.id, member);
            }
        }

        for (const user of uniqueUsers.values()) {
            await sendMessagesToUser(user, [{ body: message }]);
        }

        return { sentCount: uniqueUsers.size, targetLabel: "todos los grupos" };
    }

    const tanda = await getTandaByName(targetGroupName);
    if (!tanda) {
        throw new Error(`Tanda "${targetGroupName}" not found`);
    }

    const users = await getUsersByTandaId(tanda.id);
    for (const user of users) {
        await sendMessagesToUser(user, [{ body: message }]);
    }

    return { sentCount: users.length, targetLabel: tanda.name };
};

/**
 * Sends a collection of messages to an explicit list of users.
 *
 * @deprecated Use `sendMessagesToUser`, `sendMessagesToAdmins`, or
 * `sendMessageToTandaGroup` so recipients are resolved from current Notion data.
 */
export const sendMessagesToProvidedUsers = async (
    users: User[],
    messages: string[],
): Promise<void> => {
    try {
        for (const user of users) {
            if (!user.phone || user.phone.length < 11) {
                continue;
            }
            await sendMessagesToUser(
                user,
                messages.map((body) => ({ body })),
            );
        }
    } catch (error) {
        logger.error(`Error al enviar mensaje a usuario: ${String(error)}`);
    }
};

export const sendReminderToDebtors = async (
    debtors: Deptor[],
    tanda: Tanda,
    reminderDay: number,
) => {
    logger.info(`Sending messages to ${tanda.name} debtors (day: ${reminderDay})`);

    const unitCostFormatted = pesosFormatter.format(tanda.costPerUser);
    const periodWord =
        tanda.suscriptionType === SUSCRIPTION_TYPES.ANNUAL ? "año" : "mes";
    const periodPlural =
        tanda.suscriptionType === SUSCRIPTION_TYPES.ANNUAL ? "años" : "meses";

    for (const debtor of debtors) {
        const messages: Message[] = [];
        const totalFormatted = pesosFormatter.format(debtor.totalAmountOwed);
        const amountSummary =
            debtor.missingPayments > 1
                ? `*${totalFormatted} pesos* (${debtor.missingPayments} ${periodPlural} de ${unitCostFormatted}${
                      debtor.creditBalance > 0
                          ? `, descontando ${pesosFormatter.format(debtor.creditBalance)} de saldo a favor`
                          : ""
                  })`
                : `*${totalFormatted} pesos*`;

        if (tanda.suscriptionType === SUSCRIPTION_TYPES.MONTHLY) {
            switch (reminderDay) {
                case 5:
                    messages.push(
                        {
                            body: `Hola ${debtor.user.name} 👋🏼! Acá Tandasbot recordándote que esta semana debes pagar tu parte de *${toTitleCase(tanda.name)}* (${amountSummary} 😉).`,
                        },
                        {
                            body: `👀 Psst: Envía *pagar ${tanda.name.toLowerCase()}* para registrar tu comprobante correctamente 🤩.\n\n${SUSPENSION_WARNING}`,
                        },
                    );
                    break;

                case 3:
                    messages.push(
                        {
                            body: `Hola de nuevo 😅, te recuerdo que en 3 días es la fecha límite de *${toTitleCase(tanda.name)}*. Total a pagar: ${amountSummary}.`,
                        },
                        {
                            body: `Recuerda que puedes enviar \`datos de pago\` para ver los datos bancarios de pago 🤓.\n\n${SUSPENSION_WARNING}`,
                        },
                    );
                    break;

                case 1:
                    messages.push(
                        {
                            body: `Jeloou 👀... Mañana es la fecha límite de pago de *${toTitleCase(tanda.name)}*. Total a pagar: ${amountSummary} 🥹.`,
                        },
                        {
                            body: `Si tienes alguna situación que te impida realizar el pago a tiempo, avisa al administrador de tu tanda 🙏🏼.\n\n${SUSPENSION_WARNING}`,
                        },
                    );
                    break;

                case 0:
                    messages.push(
                        {
                            body: `🚨 ¡Hoy es la fecha límite de pago de *${toTitleCase(tanda.name)}*! Total a pagar: ${amountSummary} 💨.`,
                        },
                        {
                            body: `Envía \`pagar ${tanda.name.toLowerCase()}\` para registrar tu pago.\n\n${SUSPENSION_WARNING}`,
                        },
                    );
                    break;

                case -2:
                    messages.push(
                        {
                            body: `Hola ${debtor.user.name}, hace 2 días venció la fecha de pago de *${toTitleCase(tanda.name)}* y aún tienes *${debtor.missingPayments} ${debtor.missingPayments === 1 ? periodWord : periodPlural}* pendiente(s) por un total de ${amountSummary} 😕.`,
                        },
                        {
                            body: `Registra tu comprobante con *pagar ${tanda.name.toLowerCase()}* o contacta al administrador de tu tanda si ya pagaste.\n\n${SUSPENSION_WARNING}`,
                        },
                    );
                    break;

                default:
                    break;
            }
        } else if (tanda.suscriptionType === SUSCRIPTION_TYPES.ANNUAL) {
            switch (reminderDay) {
                case 30:
                    messages.push(
                        {
                            body: `Hola ${debtor.user.name} 👋🏼! Acá Tandasbot recordándote que este mes toca tu pago *anual* de *${toTitleCase(tanda.name)}*. Total a pagar: ${amountSummary} 😉.`,
                        },
                        {
                            body: `👀 Envía *pagar ${tanda.name.toLowerCase()}* para registrar tu comprobante 🤩.\n\n${SUSPENSION_WARNING}`,
                        },
                    );
                    break;

                case 15:
                    messages.push(
                        {
                            body: `Hola de nuevo ${debtor.user.name} 😅, te recuerdo que en 15 días vence tu parte anual de *${toTitleCase(tanda.name)}*. Total a pagar: ${amountSummary}.`,
                        },
                        {
                            body: `Puedes enviar \`datos de pago\` para ver los datos bancarios de pago 🤓.\n\n${SUSPENSION_WARNING}`,
                        },
                    );
                    break;

                case 7:
                    messages.push(
                        {
                            body: `Jeje otra vez yo 😅, en una semana vence tu parte anual de *${toTitleCase(tanda.name)}*. Total a pagar: ${amountSummary} 💵.`,
                        },
                        {
                            body: `Si ya no deseas continuar en el servicio, avisa al administrador de tu tanda 🤓.\n\n${SUSPENSION_WARNING}`,
                        },
                    );
                    break;

                case 1:
                    messages.push(
                        {
                            body: `Jeloou 👀... Mañana vence el pago anual de *${toTitleCase(tanda.name)}*. Total a pagar: ${amountSummary} 🥹.`,
                        },
                        {
                            body: `Si tienes algún inconveniente, avisa al administrador de tu tanda 🙏🏼.\n\n${SUSPENSION_WARNING}`,
                        },
                    );
                    break;

                case 0:
                    messages.push(
                        {
                            body: `🚨 ¡Hoy es la fecha límite de pago anual de *${toTitleCase(tanda.name)}*! Total a pagar: ${amountSummary} 💨.`,
                        },
                        {
                            body: `Envía \`pagar ${tanda.name.toLowerCase()}\` para registrar tu comprobante.\n\n${SUSPENSION_WARNING}`,
                        },
                    );
                    break;

                case -2:
                    messages.push(
                        {
                            body: `Hola ${debtor.user.name}, hace 2 días venció la fecha de pago de *${toTitleCase(tanda.name)}* y tienes pendiente un total de ${amountSummary} 😕.`,
                        },
                        {
                            body: `Registra tu comprobante con *pagar ${tanda.name.toLowerCase()}* o contacta al administrador de tu tanda si ya pagaste.\n\n${SUSPENSION_WARNING}`,
                        },
                    );
                    break;

                default:
                    break;
            }
        }

        if (messages.length > 0) {
            await sendMessagesToUser(debtor.user, messages);
            logger.info(`Messages sent to ${debtor.user.name}`);
        }
    }

    logger.info(`Messages sent to ${tanda.name} debtors`);
};

export const hasUserAcceptedTandaTerms = async (
    userId: string,
    tandaId: string,
): Promise<boolean> => {
    const legal = await getUserTandaLegal(userId, tandaId);
    return legal?.acceptedRules || false;
};
