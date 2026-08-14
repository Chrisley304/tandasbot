import { addKeyword, EVENTS } from "@builderbot/bot";
import { JsonFileDB as Database } from "@builderbot/database-json";
import { BaileysProvider as Provider } from "@builderbot/provider-baileys";

import {
    GENERIC_ERROR_MESSAGE,
    GENERIC_NOT_AUTHORIZED_MESSAGE,
} from "@constants/messages";
import { USER_GROUPS } from "@enums/users";
import {
    getAllUsersGroups,
    getUserFromName,
    getUserFromPhone,
} from "@utils/notion/usersDB";
import { getAllTandas, getTandaValidPayments } from "@utils/notion/tandasDB";
import {
    isUserAllowed,
    sendMessagesToUser,
    sendMessageToUserGroup,
} from "@utils/users";
import {
    getDebtorsFromMonthlyTanda,
    getDebtorsFromYearlyTanda,
    getTotalMoneyFromTandaPayments,
    handleDailyTandasReminders,
} from "@utils/tandas";
import { pesosFormatter, toTitleCase } from "@utils/misc";
import { User } from "@custom-types/notion/usersDB";
import logger from "@utils/logger";
import { SUSCRIPTION_TYPES } from "@enums/suscriptions";
import { getMexicoCityISODate } from "@utils/datetimes";
import { getCleanPhoneNumber } from "@utils/whatsapp";
import { BOT_COMMANDS } from "@enums/bot-commands";

export const messageToGroupHandler = addKeyword(EVENTS.ACTION)
    .addAnswer(
        `👥 Escribe el nombre del grupo al que deseas enviar el mensaje:`,
        { capture: true },
        async (ctx, { fallBack, state }) => {
            const groupName: string = ctx.body.toLowerCase();

            if (
                Object.values(USER_GROUPS).includes(groupName as USER_GROUPS) ||
                (await getAllUsersGroups()).includes(groupName)
            ) {
                await state.update({ groupName });
            } else {
                return fallBack(
                    "😰 No encontre el grupo que ingresaste, intentalo de nuevo",
                );
            }
        },
    )
    .addAnswer(
        "✉️ Escribe el mensaje que deseas enviar al grupo:",
        { capture: true },
        async (ctx, { flowDynamic, fallBack, state }) => {
            const message = ctx.body;

            if (message.length < 3) {
                return fallBack("El mensaje no puede ser menor a 3 letras");
            }

            try {
                const groupName: string = state.get("groupName");
                await sendMessageToUserGroup(groupName, message);
                await flowDynamic(`Mensaje enviado correctamente al grupo 😉.`);
            } catch (error) {
                logger.error(error);
                await flowDynamic(GENERIC_ERROR_MESSAGE);
            }
        },
    );

export const sendMessageToGroupFlow = addKeyword<Provider, Database>(
    [BOT_COMMANDS.SEND_GROUP_MESSAGE],
    { sensitive: true },
).addAction(async (ctx, { flowDynamic, gotoFlow }) => {
    try {
        const messagePhoneNumber = getCleanPhoneNumber(ctx.key.remoteJid!);
        const userFrom = ctx.from;
        const userInfo =
            (await getUserFromPhone(userFrom)) ||
            (await getUserFromPhone(messagePhoneNumber));

        if (isUserAllowed(userInfo, [USER_GROUPS.ADMIN])) {
            return gotoFlow(messageToGroupHandler);
        } else {
            await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
        }
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const sendMessageToUserFlow = addKeyword<Provider, Database>(
    [BOT_COMMANDS.SEND_CUSTOM_MESSAGE],
    { sensitive: true, capture: true },
).addAction(async (ctx, { flowDynamic, gotoFlow }) => {
    try {
        const messagePhoneNumber = getCleanPhoneNumber(ctx.key.remoteJid!);
        const userFrom = ctx.from;
        const userInfo =
            (await getUserFromPhone(userFrom)) ||
            (await getUserFromPhone(messagePhoneNumber));

        if (isUserAllowed(userInfo, [USER_GROUPS.ADMIN])) {
            return gotoFlow(sendMessageToUserHandler);
        } else {
            await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
        }
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const sendMessageToUserHandler = addKeyword(EVENTS.ACTION)
    .addAnswer(
        `👤 Escribe el nombre del usuario al que deseas enviar el mensaje:`,
        { capture: true },
        async (ctx, { fallBack, state }) => {
            const userName: string = toTitleCase(ctx.body);

            if (userName.length < 3) {
                return fallBack(
                    "El nombre del usuario no puede ser menor a 3 letras",
                );
            }

            const user = await getUserFromName(userName);

            if (!user) {
                return fallBack("No encontre el usuario que ingresaste");
            }

            await state.update({ userToSendMessage: user });
        },
    )
    .addAnswer(
        "✉️ Ahora escribe el mensaje que deseas enviar al usuario:",
        { capture: true },
        async (ctx, { flowDynamic, fallBack, state }) => {
            const message = ctx.body;

            if (message.length < 3) {
                return fallBack("El mensaje no puede ser menor a 3 letras");
            }

            try {
                const userToSendMessage: User = state.get("userToSendMessage");
                await sendMessagesToUser(userToSendMessage, [
                    { body: message },
                ]);
                await flowDynamic(
                    `Mensaje enviado correctamente al usuario 😉.`,
                );
            } catch (error) {
                logger.error(error);
                await flowDynamic(GENERIC_ERROR_MESSAGE);
            }
        },
    );

export const getTandasStatusFlow = addKeyword<Provider, Database>(
    BOT_COMMANDS.TANDA_STATUS,
).addAction(async (ctx, { flowDynamic }) => {
    try {
        const messagePhoneNumber = getCleanPhoneNumber(ctx.key.remoteJid!);
        const userFrom = ctx.from;
        const userInfo =
            (await getUserFromPhone(userFrom)) ||
            (await getUserFromPhone(messagePhoneNumber));

        if (isUserAllowed(userInfo, [USER_GROUPS.ADMIN])) {
            const tandas = await getAllTandas();
            const currentDatetime = new Date();

            await flowDynamic("📊 *Estatus de las tandas*:");

            await tandas.forEach(async (tanda) => {
                const messages: string[] = [];
                const tandaDebtors =
                    tanda.suscriptionType === "monthly"
                        ? await getDebtorsFromMonthlyTanda(
                              tanda,
                              currentDatetime,
                          )
                        : await getDebtorsFromYearlyTanda(
                              tanda,
                              currentDatetime,
                          );

                const debtorsList = tandaDebtors.map(
                    (debtor) =>
                        `- ${debtor.user.name} (${debtor.missingPayments} pago${
                            debtor.missingPayments > 1 ? "s" : ""
                        })`,
                );

                const allNotOverduePayments = await getTandaValidPayments(
                    tanda.name,
                );

                const tandaTotalAmount: number = allNotOverduePayments
                    ? getTotalMoneyFromTandaPayments(
                          tanda,
                          allNotOverduePayments,
                      )
                    : 0;

                messages.push(
                    `*${toTitleCase(tanda.name)}*:\n${
                        debtorsList.length > 0
                            ? `😕 Faltan en pagar este ${
                                  tanda.suscriptionType ===
                                  SUSCRIPTION_TYPES.ANNUAL
                                      ? "año"
                                      : "mes"
                              }:\n${debtorsList.join("\n")}`
                            : `🎉 Nadie falta en pagar este ${
                                  tanda.suscriptionType ===
                                  SUSCRIPTION_TYPES.ANNUAL
                                      ? "año"
                                      : "mes"
                              }`
                    }\n💵 Dinero en total de la tanda: ${pesosFormatter.format(
                        tandaTotalAmount,
                    )}`,
                );

                await flowDynamic(messages);
            });
        } else {
            await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
        }
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const sendDailyRemindersFlow = addKeyword<Provider, Database>(
    BOT_COMMANDS.RESEND_TANDA_REMINDERS,
).addAction(async (ctx, { flowDynamic }) => {
    try {
        const messagePhoneNumber = getCleanPhoneNumber(ctx.key.remoteJid!);
        const userFrom = ctx.from;
        const userInfo =
            (await getUserFromPhone(userFrom)) ||
            (await getUserFromPhone(messagePhoneNumber));
        if (isUserAllowed(userInfo, [USER_GROUPS.ADMIN])) {
            await handleDailyTandasReminders();
        } else {
            await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
        }
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});
