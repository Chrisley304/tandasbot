import { addKeyword, EVENTS } from "@builderbot/bot";
import { JsonFileDB as Database } from "@builderbot/database-json";
import { BaileysProvider as Provider } from "@builderbot/provider-baileys";

import {
    GENERIC_ERROR_MESSAGE,
    GENERIC_NOT_AUTHORIZED_MESSAGE,
    GENERIC_USER_HAS_NOT_ACCEPTED_TERMS_MESSAGE,
} from "@constants/messages";
import { USER_GROUPS } from "@enums/users";
import { getUserFromPhone } from "@utils/notion/usersDB";
import {
    getLastUserTandaPayments,
    getTandaByName,
    userAcceptTandaTermsHandler,
} from "@utils/notion/tandasDB";
import {
    hasUserAcceptedTandaTerms,
    isUserAllowed,
    sendMessagesToUser,
} from "@utils/users";
import { pesosFormatter, toTitleCase } from "@utils/misc";
import { getUserMissingPayments, handleTandaPayment } from "@utils/tandas";
import { savePaymentPhoto } from "@utils/files";
import { Payment } from "@custom-types/payments";
import { ADMIN_USER } from "@constants/users";
import { Message } from "@custom-types/messages";
import { SUSCRIPTION_TYPES } from "@enums/suscriptions";
import logger from "@utils/logger";
import { getCleanPhoneNumber } from "@utils/whatsapp";
import {
    generateAmazonPrimeRulesMessage,
    generateHBOMaxRulesMessage,
    generateSpotifyRulesMessage,
    generateYoutubePremiumRulesMessage,
} from "@constants/tandasRules";
import { BOT_COMMANDS } from "@enums/bot-commands";

export const spotifyStatusFlow = addKeyword<Provider, Database>(
    BOT_COMMANDS.MY_SPOTIFY,
).addAction(async (ctx, { flowDynamic }) => {
    try {
        const messagePhoneNumber = getCleanPhoneNumber(ctx.key.remoteJid!);
        const userFrom = ctx.from;
        const user =
            (await getUserFromPhone(userFrom)) ||
            (await getUserFromPhone(messagePhoneNumber));
        const tanda = await getTandaByName(USER_GROUPS.SPOTIFY);
        const currentDatetime = new Date();
        const currentMonthTandaDate = new Date(
            Date.UTC(
                currentDatetime.getFullYear(),
                currentDatetime.getMonth(),
                tanda.paymentDay.getDate() + 1,
            ),
        );
        const messages: string[] = [];

        if (isUserAllowed(user, [USER_GROUPS.SPOTIFY])) {
            if (!hasUserAcceptedTandaTerms(USER_GROUPS.SPOTIFY, user)) {
                await flowDynamic(
                    GENERIC_USER_HAS_NOT_ACCEPTED_TERMS_MESSAGE(
                        USER_GROUPS.SPOTIFY,
                    ),
                );
                return;
            }

            logger.info(
                `${user.name} is checking the status of their Spotify payments`,
            );

            const lastUserPayments = await getLastUserTandaPayments(
                user.id,
                USER_GROUPS.SPOTIFY,
            );

            if (lastUserPayments.length > 0) {
                if (lastUserPayments[0].nextPayment <= currentMonthTandaDate) {
                    const missingPayments = await getUserMissingPayments(
                        tanda,
                        user,
                        currentDatetime,
                        tanda.suscriptionType as SUSCRIPTION_TYPES,
                    );

                    messages.push(
                        `¡Este mes *necesitas realizar tu pago* de Spotify 👀! Tienes pendientes ${missingPayments} pago${
                            missingPayments > 1 ? "s" : ""
                        }`,
                    );
                } else {
                    messages.push(
                        `¡Estas *al corriente* con tus pagos de Spotify! 🎉\nTu siguiente pago debe ser antes del *${lastUserPayments[0].nextPayment.toLocaleDateString(
                            "es-MX",
                        )}*`,
                    );
                }
                messages.push(
                    "A continuación muestro tus últimos pagos de Spotify 🎶:",
                );

                lastUserPayments.forEach((paymentInfo) => {
                    messages.push(
                        `📅 ${paymentInfo.paymentDate.toLocaleDateString(
                            "es-MX",
                        )} - 💵 ${pesosFormatter.format(
                            paymentInfo.payment,
                        )} pesos - ⏳ ${paymentInfo.paidPeriods} meses pagados`,
                    );
                });
            } else {
                messages.push(
                    "😰 Aún no has hecho ningún pago, si crees que esto es un error por favor avisame a mi numero personal!",
                );
            }
            await flowDynamic(messages);
        } else {
            await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
        }
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const maxStatusFlow = addKeyword<Provider, Database>(
    BOT_COMMANDS.MY_HBO_MAX,
).addAction(async (ctx, { flowDynamic }) => {
    try {
        const messagePhoneNumber = getCleanPhoneNumber(ctx.key.remoteJid!);
        const userFrom = ctx.from;
        const user =
            (await getUserFromPhone(userFrom)) ||
            (await getUserFromPhone(messagePhoneNumber));
        const tanda = await getTandaByName(USER_GROUPS.MAX);
        const currentDatetime = new Date();
        const currentMonthTandaDate = new Date(
            Date.UTC(
                currentDatetime.getFullYear(),
                currentDatetime.getMonth(),
                tanda.paymentDay.getDate() + 1,
            ),
        );
        const messages: string[] = [];

        if (isUserAllowed(user, [USER_GROUPS.MAX])) {
            if (!hasUserAcceptedTandaTerms(USER_GROUPS.MAX, user)) {
                await flowDynamic(
                    GENERIC_USER_HAS_NOT_ACCEPTED_TERMS_MESSAGE(
                        USER_GROUPS.MAX,
                    ),
                );
                return;
            }

            logger.info(
                `${user.name} is checking the status of their HBO Max payments`,
            );

            const lastUserPayments = await getLastUserTandaPayments(
                user.id,
                USER_GROUPS.MAX,
            );

            if (lastUserPayments.length > 0) {
                if (lastUserPayments[0].nextPayment <= currentMonthTandaDate) {
                    const missingPayments = await getUserMissingPayments(
                        tanda,
                        user,
                        currentDatetime,
                        tanda.suscriptionType as SUSCRIPTION_TYPES,
                    );

                    messages.push(
                        `¡Este mes *necesitas realizar tu pago* de HBO Max 👀! Tienes pendientes ${missingPayments} pago${
                            missingPayments > 1 ? "s" : ""
                        }`,
                    );
                } else {
                    messages.push(
                        `¡Estas *al corriente* con tus pagos de HBO Max! 🎉 \nTu siguiente pago debe ser antes del *${lastUserPayments[0].nextPayment.toLocaleDateString(
                            "es-MX",
                        )}*`,
                    );
                }
                messages.push(
                    "A continuación muestro tus últimos pagos de HBO Max 🍿:",
                );

                lastUserPayments.forEach((paymentInfo) => {
                    messages.push(
                        `📅 ${paymentInfo.paymentDate.toLocaleDateString(
                            "es-MX",
                        )} - 💵 ${pesosFormatter.format(
                            paymentInfo.payment,
                        )} pesos - ⏳ ${paymentInfo.paidPeriods} mes${
                            paymentInfo.paidPeriods > 1 ? "es" : ""
                        } pagado${paymentInfo.paidPeriods > 1 ? "s" : ""}`,
                    );
                });
            } else {
                messages.push(
                    "😰 Aún no has hecho ningún pago, si crees que esto es un error por favor avisame a mi numero personal!",
                );
            }
            await flowDynamic(messages);
        } else {
            await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
        }
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const amazonPrimeStatusFlow = addKeyword<Provider, Database>(
    BOT_COMMANDS.MY_AMAZON,
).addAction(async (ctx, { flowDynamic }) => {
    try {
        const messagePhoneNumber = getCleanPhoneNumber(ctx.key.remoteJid!);
        const userFrom = ctx.from;
        const user =
            (await getUserFromPhone(userFrom)) ||
            (await getUserFromPhone(messagePhoneNumber));
        const tanda = await getTandaByName(USER_GROUPS.AMAZON_PRIME);
        const currentDatetime = new Date();
        const currentYearTandaDate = new Date(
            Date.UTC(
                currentDatetime.getFullYear(),
                tanda.paymentDay.getMonth(),
                tanda.paymentDay.getDate() + 1,
            ),
        );
        const messages: string[] = [];

        if (isUserAllowed(user, [USER_GROUPS.AMAZON_PRIME])) {
            if (!hasUserAcceptedTandaTerms(USER_GROUPS.AMAZON_PRIME, user)) {
                await flowDynamic(
                    GENERIC_USER_HAS_NOT_ACCEPTED_TERMS_MESSAGE(
                        USER_GROUPS.AMAZON_PRIME,
                    ),
                );
                return;
            }

            logger.info(
                `${user.name} is checking the status of their Amazon Prime payments`,
            );

            const lastUserPayments = await getLastUserTandaPayments(
                user.id,
                USER_GROUPS.AMAZON_PRIME,
            );

            if (lastUserPayments.length > 0) {
                if (lastUserPayments[0].nextPayment <= currentYearTandaDate) {
                    const missingPayments = await getUserMissingPayments(
                        tanda,
                        user,
                        currentDatetime,
                        tanda.suscriptionType as SUSCRIPTION_TYPES,
                    );

                    messages.push(
                        `*Necesitas realizar tu pago* de Amazon Prime 👀! Tienes pendientes ${missingPayments} pago${
                            missingPayments > 1 ? "s" : ""
                        }`,
                    );
                } else {
                    messages.push(
                        `¡Estas *al corriente* con tu pago de Amazon Prime! 🎉\nTu siguiente pago debe ser antes del *${lastUserPayments[0].nextPayment.toLocaleDateString(
                            "es-MX",
                        )}*`,
                    );
                }
                messages.push(
                    "A continuación muestro tus últimos pagos de Amazon Prime 📦:",
                );

                lastUserPayments.forEach((paymentInfo) => {
                    messages.push(
                        `📅 ${paymentInfo.paymentDate.toLocaleDateString(
                            "es-MX",
                        )} - 💵 ${pesosFormatter.format(
                            paymentInfo.payment,
                        )} pesos`,
                    );
                });
            } else {
                messages.push(
                    "😰 Aún no has hecho ningún pago, si crees que esto es un error por favor avisame a mi numero personal!",
                );
            }
            await flowDynamic(messages);
        } else {
            await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
        }
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const chrisPaymentInfoFlow = addKeyword<Provider, Database>(
    BOT_COMMANDS.PAYMENT_DETAILS,
).addAction(async (ctx, { flowDynamic }) => {
    try {
        const messagePhoneNumber = getCleanPhoneNumber(ctx.key.remoteJid!);
        const userFrom = ctx.from;
        const user =
            (await getUserFromPhone(userFrom)) ||
            (await getUserFromPhone(messagePhoneNumber));

        if (
            isUserAllowed(user, [
                USER_GROUPS.SPOTIFY,
                USER_GROUPS.AMAZON_PRIME,
                USER_GROUPS.MAX,
                USER_GROUPS.FAMILY,
                USER_GROUPS.ADMIN,
                USER_GROUPS.YOUTUBE_PREMIUM,
            ])
        ) {
            const messages: string[] = [
                "📄 Mis datos de pago:",
                "👤 *Nombre*: Christian Alejandro Leyva Mercado",
                "🏦 *Banco*: NU MEXICO",
                "🔑 *CLABE*: 6381 8000 0110 380148",
            ];

            await flowDynamic(messages.join("\n"));
        } else {
            await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
        }
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const spotifyPaymentHandler = addKeyword(EVENTS.ACTION)
    .addAnswer(
        "💲 Escribe el monto *con unicamente numeros* del pago que realizaste (ej. `180` ó `40.5` ó `68.99` ó `20.00` ):",
        { capture: true },
        async (ctx, { flowDynamic, fallBack, state }) => {
            try {
                const paymentAmount = parseFloat(ctx.body);

                if (isNaN(paymentAmount) || paymentAmount <= 0) {
                    return fallBack(
                        "El monto del pago debe estar escrito con *unicamente números* (ej. `180` ó `40.5` ó `68.99` ó `20.00` ).\nIntentalo de nuevo.",
                    );
                }

                await state.update({ paymentAmount });

                await flowDynamic(
                    `¿El monto ${pesosFormatter.format(
                        paymentAmount,
                    )} es correcto?\n(si/no)`,
                );
            } catch (error) {
                return fallBack(
                    "😰 No pude entender el monto del pago, intentalo de nuevo",
                );
            }
        },
    )
    .addAction(
        { capture: true },
        async (ctx, { flowDynamic, fallBack, state, gotoFlow }) => {
            const message = ctx.body.toLowerCase();

            if (message === "si") {
                await flowDynamic(
                    "Ahora por favor envia el comprobante de pago 📸",
                );
            } else if (message === "no") {
                await state.clear();
                return gotoFlow(spotifyPaymentHandler);
            } else {
                return fallBack("Por favor, escribe `si` o `no`");
            }
        },
    )
    .addAction(
        { capture: true },
        async (ctx, { flowDynamic, state, provider }) => {
            try {
                const messagePhoneNumber = getCleanPhoneNumber(
                    ctx.key.remoteJid!,
                );

                const paymentAmount = state.get("paymentAmount");
                const paymentDate = new Date();
                const userFrom = ctx.from;
                const user =
                    (await getUserFromPhone(userFrom)) ||
                    (await getUserFromPhone(messagePhoneNumber));

                const voucherPath = await savePaymentPhoto(
                    ctx,
                    provider,
                    user.id,
                );

                const payment: Payment = {
                    paymentDate,
                    amount: paymentAmount,
                    user: user,
                    tanda: USER_GROUPS.SPOTIFY,
                    voucherPath,
                };

                const { paidPeriods, nextPayment } =
                    await handleTandaPayment(payment);

                await state.clear();

                await flowDynamic(
                    `¡Pago de ${toTitleCase(
                        USER_GROUPS.SPOTIFY,
                    )} 🎧 registrado correctamente! 🎉\n\n📅 *Fecha de pago*: ${paymentDate.toLocaleDateString(
                        "es-MX",
                    )}\n💵 *Monto*: ${pesosFormatter.format(
                        paymentAmount,
                    )} pesos\n⏳ *Meses pagados*: ${paidPeriods} (siguiente pago: ${nextPayment.toLocaleDateString(
                        "es-MX",
                    )})`,
                );

                // Resend the voucher to the admin
                const messagesToAdmin: Message[] = [
                    {
                        body: voucherPath,
                        type: "image",
                        alt: `📸 Te comparto el comprobante de pago de *${
                            user.name
                        }* para ${toTitleCase(
                            USER_GROUPS.SPOTIFY,
                        )} por *💵 ${pesosFormatter.format(
                            paymentAmount,
                        )} pesos*`,
                    },
                ];

                await sendMessagesToUser(ADMIN_USER, messagesToAdmin);
                logger.info(
                    `${user.name} paid ${paidPeriods} months of Spotify`,
                );
            } catch (error) {
                logger.error(error);
                await flowDynamic(GENERIC_ERROR_MESSAGE);
            }
        },
    );

export const registerSpotifyPayment = addKeyword<Provider, Database>(
    BOT_COMMANDS.PAY_SPOTIFY,
).addAction(async (ctx, { flowDynamic, gotoFlow }) => {
    try {
        const messagePhoneNumber = getCleanPhoneNumber(ctx.key.remoteJid!);
        const userFrom = ctx.from;
        const user =
            (await getUserFromPhone(userFrom)) ||
            (await getUserFromPhone(messagePhoneNumber));

        if (isUserAllowed(user, [USER_GROUPS.SPOTIFY])) {
            if (!hasUserAcceptedTandaTerms(USER_GROUPS.SPOTIFY, user)) {
                await flowDynamic(
                    GENERIC_USER_HAS_NOT_ACCEPTED_TERMS_MESSAGE(
                        USER_GROUPS.SPOTIFY,
                    ),
                );
                return;
            }

            // TODO: Agregar el monto que debe pagar por mes a la persona, solo como recordatorio de cuanto debío pagar xd

            logger.info(`${user.name} is making a payment for Spotify`);

            return gotoFlow(spotifyPaymentHandler);
        } else {
            await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
        }
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const maxPaymentHandler = addKeyword(EVENTS.ACTION)
    .addAnswer(
        "💲 Escribe el monto *con unicamente numeros* del pago que realizaste (ej. `180` ó `40.5` ó `68.99` ó `20.00` ):",
        { capture: true },
        async (ctx, { flowDynamic, fallBack, state }) => {
            try {
                const paymentAmount = parseFloat(ctx.body);

                if (isNaN(paymentAmount) || paymentAmount <= 0) {
                    return fallBack(
                        "El monto del pago debe estar escrito con *unicamente números* (ej. `180` ó `40.5` ó `68.99` ó `20.00` ).\nIntentalo de nuevo.",
                    );
                }

                await state.update({ paymentAmount });

                await flowDynamic(
                    `¿El monto ${pesosFormatter.format(
                        paymentAmount,
                    )} es correcto?\n(si/no)`,
                );
            } catch (error) {
                return fallBack(
                    "😰 No pude entender el monto del pago, intentalo de nuevo",
                );
            }
        },
    )
    .addAction(
        { capture: true },
        async (ctx, { flowDynamic, fallBack, state, gotoFlow }) => {
            const message = ctx.body.toLowerCase();

            if (message === "si") {
                await flowDynamic(
                    "Ahora por favor envia el comprobante de pago 📸",
                );
            } else if (message === "no") {
                await state.clear();
                return gotoFlow(maxPaymentHandler);
            } else {
                return fallBack("Por favor, escribe `si` o `no`");
            }
        },
    )
    .addAction(
        { capture: true },
        async (ctx, { flowDynamic, state, provider }) => {
            try {
                const messagePhoneNumber = getCleanPhoneNumber(
                    ctx.key.remoteJid!,
                );

                const paymentAmount = state.get("paymentAmount");
                const paymentDate = new Date();
                const userFrom = ctx.from;
                const user =
                    (await getUserFromPhone(userFrom)) ||
                    (await getUserFromPhone(messagePhoneNumber));

                const voucherPath = await savePaymentPhoto(
                    ctx,
                    provider,
                    user.id,
                );

                const payment: Payment = {
                    paymentDate,
                    amount: paymentAmount,
                    user: user,
                    tanda: USER_GROUPS.MAX,
                    voucherPath,
                };

                const { paidPeriods, nextPayment } =
                    await handleTandaPayment(payment);

                await state.clear();

                await flowDynamic(
                    `¡Pago de ${toTitleCase(
                        USER_GROUPS.MAX,
                    )} 🍿 registrado correctamente! 🎉\n\n📅 *Fecha de pago*: ${paymentDate.toLocaleDateString(
                        "es-MX",
                    )}\n💵 *Monto*: ${pesosFormatter.format(
                        paymentAmount,
                    )} pesos\n⏳ *Meses pagados*: ${paidPeriods} (siguiente pago: ${nextPayment.toLocaleDateString(
                        "es-MX",
                    )})`,
                );

                // Resend the voucher to the admin
                const messagesToAdmin: Message[] = [
                    {
                        body: voucherPath,
                        type: "image",
                        alt: `📸 Te comparto el comprobante de pago de *${
                            user.name
                        }* para ${toTitleCase(
                            USER_GROUPS.MAX,
                        )} por *💵 ${pesosFormatter.format(
                            paymentAmount,
                        )} pesos*`,
                    },
                ];

                await sendMessagesToUser(ADMIN_USER, messagesToAdmin);
                logger.info(
                    `${user.name} paid ${paidPeriods} months of HBO Max`,
                );
            } catch (error) {
                logger.error(error);
                await flowDynamic(GENERIC_ERROR_MESSAGE);
            }
        },
    );

export const registerMaxPayment = addKeyword<Provider, Database>(
    BOT_COMMANDS.PAY_HBO_MAX,
).addAction(async (ctx, { flowDynamic, gotoFlow }) => {
    try {
        const messagePhoneNumber = getCleanPhoneNumber(ctx.key.remoteJid!);
        const userFrom = ctx.from;
        const user =
            (await getUserFromPhone(userFrom)) ||
            (await getUserFromPhone(messagePhoneNumber));

        if (isUserAllowed(user, [USER_GROUPS.MAX])) {
            if (!hasUserAcceptedTandaTerms(USER_GROUPS.MAX, user)) {
                await flowDynamic(
                    GENERIC_USER_HAS_NOT_ACCEPTED_TERMS_MESSAGE(
                        USER_GROUPS.MAX,
                    ),
                );
                return;
            }

            logger.info(`${user.name} is making a payment for HBO Max`);

            return gotoFlow(maxPaymentHandler);
        } else {
            await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
        }
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const amazonPaymentHandler = addKeyword(EVENTS.ACTION)
    .addAnswer(
        "💲 Escribe el monto *con unicamente numeros* del pago que realizaste (ej. `180` ó `40.5` ó `68.99` ó `20.00` ):",
        { capture: true },
        async (ctx, { flowDynamic, fallBack, state }) => {
            try {
                const paymentAmount = parseFloat(ctx.body);

                if (isNaN(paymentAmount) || paymentAmount <= 0) {
                    return fallBack(
                        "El monto del pago debe estar escrito con *unicamente números* (ej. `180` ó `40.5` ó `68.99` ó `20.00` ).\nIntentalo de nuevo.",
                    );
                }

                await state.update({ paymentAmount });

                await flowDynamic(
                    `¿El monto ${pesosFormatter.format(
                        paymentAmount,
                    )} es correcto?\n(si/no)`,
                );
            } catch (error) {
                return fallBack(
                    "😰 No pude entender el monto del pago, intentalo de nuevo",
                );
            }
        },
    )
    .addAction(
        { capture: true },
        async (ctx, { flowDynamic, fallBack, state, gotoFlow }) => {
            const message = ctx.body.toLowerCase();

            if (message === "si") {
                await flowDynamic(
                    "Ahora por favor envia el comprobante de pago 📸",
                );
            } else if (message === "no") {
                await state.clear();
                return gotoFlow(amazonPaymentHandler);
            } else {
                return fallBack("Por favor, escribe `si` o `no`");
            }
        },
    )
    .addAction(
        { capture: true },
        async (ctx, { flowDynamic, state, provider }) => {
            try {
                const messagePhoneNumber = getCleanPhoneNumber(
                    ctx.key.remoteJid!,
                );
                const paymentAmount = state.get("paymentAmount");
                const paymentDate = new Date();
                const userFrom = ctx.from;
                const user =
                    (await getUserFromPhone(userFrom)) ||
                    (await getUserFromPhone(messagePhoneNumber));

                const voucherPath = await savePaymentPhoto(
                    ctx,
                    provider,
                    user.id,
                );

                const payment: Payment = {
                    paymentDate,
                    amount: paymentAmount,
                    user: user,
                    tanda: USER_GROUPS.AMAZON_PRIME,
                    voucherPath,
                };

                const { nextPayment, paidPeriods } =
                    await handleTandaPayment(payment);

                await state.clear();

                await flowDynamic(
                    `¡Pago de ${toTitleCase(
                        USER_GROUPS.AMAZON_PRIME,
                    )} 📦 registrado correctamente! 🎉\n\n📅 *Fecha de pago*: ${paymentDate.toLocaleDateString(
                        "es-MX",
                    )}\n💵 *Monto*: ${pesosFormatter.format(
                        paymentAmount,
                    )} pesos\n⏳ *Años pagados*: ${paidPeriods} (siguiente pago: ${nextPayment.toLocaleDateString(
                        "es-MX",
                    )})`,
                );

                // Resend the voucher to the admin
                const messagesToAdmin: Message[] = [
                    {
                        body: voucherPath,
                        type: "image",
                        alt: `📸 Te comparto el comprobante de pago de *${
                            user.name
                        }* para ${toTitleCase(
                            USER_GROUPS.AMAZON_PRIME,
                        )} por *💵 ${pesosFormatter.format(
                            paymentAmount,
                        )} pesos*`,
                    },
                ];

                await sendMessagesToUser(ADMIN_USER, messagesToAdmin);
                logger.info(
                    `${user.name} paid ${paidPeriods} years of Amazon Prime`,
                );
            } catch (error) {
                logger.error(error);
                await flowDynamic(GENERIC_ERROR_MESSAGE);
            }
        },
    );

export const registerAmazonPayment = addKeyword<Provider, Database>(
    BOT_COMMANDS.PAY_AMAZON,
).addAction(async (ctx, { flowDynamic, gotoFlow }) => {
    try {
        const messagePhoneNumber = getCleanPhoneNumber(ctx.key.remoteJid!);
        const userFrom = ctx.from;
        const user =
            (await getUserFromPhone(userFrom)) ||
            (await getUserFromPhone(messagePhoneNumber));

        if (isUserAllowed(user, [USER_GROUPS.AMAZON_PRIME])) {
            if (!hasUserAcceptedTandaTerms(USER_GROUPS.AMAZON_PRIME, user)) {
                await flowDynamic(
                    GENERIC_USER_HAS_NOT_ACCEPTED_TERMS_MESSAGE(
                        USER_GROUPS.AMAZON_PRIME,
                    ),
                );
                return;
            }

            logger.info(`${user.name} is making a payment for Amazon Prime`);

            return gotoFlow(amazonPaymentHandler);
        } else {
            await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
        }
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const acceptTermsHandler = addKeyword(EVENTS.ACTION).addAnswer(
    `👀 ¿Aceptas las reglas de la tanda? (si/no)`,
    { capture: true },
    async (ctx, { flowDynamic, fallBack, state }) => {
        try {
            const message = ctx.body.toLowerCase();
            const userPhoneNumber = getCleanPhoneNumber(ctx.key.remoteJid!);
            const user = await getUserFromPhone(userPhoneNumber);
            const tanda = state.get("tandaToAcceptTerms");

            if (message === "si") {
                await userAcceptTandaTermsHandler(tanda, user);
                await flowDynamic(
                    "Perfecto, has aceptado las reglas de la tanda 🎉. Ahora puedes usar las funciones de la tanda!",
                );
                state.clear();
            } else if (message === "no") {
                await flowDynamic(
                    "Oh no 😢, si tienes alguna duda con las reglas o ya no quieres formar parte de la tanda, *por favor avisame a mi número personal*.\nSi cambias de opinión puedes aceptar las reglas en cualquier momento 🙂.",
                );
                state.clear();
            } else {
                return fallBack("Por favor, escribe `si` o `no`");
            }
        } catch (error) {
            return fallBack(
                "😰 Algo falló al intentar aceptar las reglas. Intentalo de nuevo.\nSi el error persiste por favor reportamelo a mi número personal 🙏🏼",
            );
        }
    },
);

export const spotifyRulesFlow = addKeyword<Provider, Database>(
    BOT_COMMANDS.SPOTIFY_RULES,
).addAction(async (ctx, { flowDynamic, gotoFlow, state }) => {
    try {
        const messagePhoneNumber = getCleanPhoneNumber(ctx.key.remoteJid!);
        const userFrom = ctx.from;
        const user =
            (await getUserFromPhone(userFrom)) ||
            (await getUserFromPhone(messagePhoneNumber));

        if (isUserAllowed(user, [USER_GROUPS.SPOTIFY, USER_GROUPS.ADMIN])) {
            const tanda = await getTandaByName(USER_GROUPS.SPOTIFY);

            const messages = generateSpotifyRulesMessage(tanda);

            await flowDynamic(messages.join("\n"));

            if (
                user.id !== "admin" &&
                !hasUserAcceptedTandaTerms(USER_GROUPS.SPOTIFY, user)
            ) {
                await state.update({ tandaToAcceptTerms: USER_GROUPS.SPOTIFY });
                return gotoFlow(acceptTermsHandler);
            }
        } else {
            await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
        }
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const maxRulesFlow = addKeyword<Provider, Database>(
    BOT_COMMANDS.HBO_MAX_RULES,
).addAction(async (ctx, { flowDynamic, gotoFlow, state }) => {
    try {
        const messagePhoneNumber = getCleanPhoneNumber(ctx.key.remoteJid!);
        const userFrom = ctx.from;
        const user =
            (await getUserFromPhone(userFrom)) ||
            (await getUserFromPhone(messagePhoneNumber));

        if (isUserAllowed(user, [USER_GROUPS.MAX, USER_GROUPS.ADMIN])) {
            const tanda = await getTandaByName(USER_GROUPS.MAX);

            const messages: string[] = generateHBOMaxRulesMessage(tanda);

            await flowDynamic(messages.join("\n"));

            if (
                user.id !== "admin" &&
                !hasUserAcceptedTandaTerms(USER_GROUPS.MAX, user)
            ) {
                await state.update({ tandaToAcceptTerms: USER_GROUPS.MAX });
                return gotoFlow(acceptTermsHandler);
            }
        } else {
            await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
        }
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const amazonPrimeRulesFlow = addKeyword<Provider, Database>(
    BOT_COMMANDS.AMAZON_PRIME_RULES,
).addAction(async (ctx, { flowDynamic, gotoFlow, state }) => {
    try {
        const messagePhoneNumber = getCleanPhoneNumber(ctx.key.remoteJid!);
        const userFrom = ctx.from;
        const user =
            (await getUserFromPhone(userFrom)) ||
            (await getUserFromPhone(messagePhoneNumber));

        if (
            isUserAllowed(user, [USER_GROUPS.AMAZON_PRIME, USER_GROUPS.ADMIN])
        ) {
            const tanda = await getTandaByName(USER_GROUPS.AMAZON_PRIME);

            const messages = generateAmazonPrimeRulesMessage(tanda);

            await flowDynamic(messages.join("\n"));

            if (
                user.id !== "admin" &&
                !hasUserAcceptedTandaTerms(USER_GROUPS.AMAZON_PRIME, user)
            ) {
                await state.update({
                    tandaToAcceptTerms: USER_GROUPS.AMAZON_PRIME,
                });
                return gotoFlow(acceptTermsHandler);
            }
        } else {
            await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
        }
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

// Youtube Premium

export const registerYoutubePremiumPayment = addKeyword<Provider, Database>(
    BOT_COMMANDS.PAY_YOUTUBE,
).addAction(async (ctx, { flowDynamic, gotoFlow }) => {
    const messagePhoneNumber = getCleanPhoneNumber(ctx.key.remoteJid!);
    const userFrom = ctx.from;
    const user =
        (await getUserFromPhone(userFrom)) ||
        (await getUserFromPhone(messagePhoneNumber));

    try {
        const userFrom = ctx.from;
        const user =
            (await getUserFromPhone(userFrom)) ||
            (await getUserFromPhone(messagePhoneNumber));

        if (isUserAllowed(user, [USER_GROUPS.YOUTUBE_PREMIUM])) {
            if (!hasUserAcceptedTandaTerms(USER_GROUPS.YOUTUBE_PREMIUM, user)) {
                await flowDynamic(
                    GENERIC_USER_HAS_NOT_ACCEPTED_TERMS_MESSAGE(
                        USER_GROUPS.YOUTUBE_PREMIUM,
                    ),
                );
                return;
            }

            logger.info(`${user.name} is making a payment for Youtube Premium`);

            return gotoFlow(youtubePremiumPaymentHandler);
        } else {
            await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
        }
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const youtubePremiumPaymentHandler = addKeyword(EVENTS.ACTION)
    .addAnswer(
        "💲 Escribe el monto *con unicamente numeros* del pago que realizaste (ej. `180` ó `40.5` ó `68.99` ó `20.00` ):",
        { capture: true },
        async (ctx, { flowDynamic, fallBack, state }) => {
            try {
                const paymentAmount = parseFloat(ctx.body);

                if (isNaN(paymentAmount) || paymentAmount <= 0) {
                    return fallBack(
                        "El monto del pago debe estar escrito con *unicamente números* (ej. `180` ó `40.5` ó `68.99` ó `20.00` ).\nIntentalo de nuevo.",
                    );
                }

                await state.update({ paymentAmount });

                await flowDynamic(
                    `¿El monto ${pesosFormatter.format(
                        paymentAmount,
                    )} es correcto?\n(si/no)`,
                );
            } catch (error) {
                return fallBack(
                    "😰 No pude entender el monto del pago, intentalo de nuevo",
                );
            }
        },
    )
    .addAction(
        { capture: true },
        async (ctx, { flowDynamic, fallBack, state, gotoFlow }) => {
            const message = ctx.body.toLowerCase();

            if (message === "si") {
                await flowDynamic(
                    "Ahora por favor envia el comprobante de pago 📸",
                );
            } else if (message === "no") {
                await state.clear();
                return gotoFlow(youtubePremiumPaymentHandler);
            } else {
                return fallBack("Por favor, escribe `si` o `no`");
            }
        },
    )
    .addAction(
        { capture: true },
        async (ctx, { flowDynamic, state, provider }) => {
            const messagePhoneNumber = getCleanPhoneNumber(ctx.key.remoteJid!);
            const userFrom = ctx.from;
            const user =
                (await getUserFromPhone(userFrom)) ||
                (await getUserFromPhone(messagePhoneNumber));

            const paymentAmount: number = state.get("paymentAmount");
            const paymentDate = new Date();

            try {
                const userFrom = ctx.from;
                const user =
                    (await getUserFromPhone(userFrom)) ||
                    (await getUserFromPhone(messagePhoneNumber));

                const voucherPath = await savePaymentPhoto(
                    ctx,
                    provider,
                    user.id,
                );

                const payment: Payment = {
                    paymentDate,
                    amount: paymentAmount,
                    user: user,
                    tanda: USER_GROUPS.YOUTUBE_PREMIUM,
                    voucherPath,
                };

                const { paidPeriods, nextPayment } =
                    await handleTandaPayment(payment);

                await state.clear();

                await flowDynamic(
                    `¡Pago de ${toTitleCase(
                        USER_GROUPS.YOUTUBE_PREMIUM,
                    )} 🎥 registrado correctamente! 🎉\n\n📅 *Fecha de pago*: ${paymentDate.toLocaleDateString(
                        "es-MX",
                    )}\n💵 *Monto*: ${pesosFormatter.format(
                        paymentAmount,
                    )} pesos\n⏳ *Meses pagados*: ${paidPeriods} (siguiente pago: ${nextPayment.toLocaleDateString(
                        "es-MX",
                    )})`,
                );

                // Resend the voucher to the admin
                const messagesToAdmin: Message[] = [
                    {
                        body: voucherPath,
                        type: "image",
                        alt: `📸 Te comparto el comprobante de pago de *${
                            user.name
                        }* para ${toTitleCase(
                            USER_GROUPS.YOUTUBE_PREMIUM,
                        )} por *💵 ${pesosFormatter.format(
                            paymentAmount,
                        )} pesos*`,
                    },
                ];

                await sendMessagesToUser(ADMIN_USER, messagesToAdmin);
                logger.info(
                    `${user.name} paid ${paidPeriods} months of Youtube Premium`,
                );
            } catch (error) {
                logger.error(error);
                await flowDynamic(GENERIC_ERROR_MESSAGE);
            }
        },
    );

export const youtubeRulesFlow = addKeyword<Provider, Database>(
    BOT_COMMANDS.YOUTUBE_PREMIUM_RULES,
).addAction(async (ctx, { flowDynamic, gotoFlow, state }) => {
    try {
        const messagePhoneNumber = getCleanPhoneNumber(ctx.key.remoteJid!);
        const userFrom = ctx.from;
        const user =
            (await getUserFromPhone(userFrom)) ||
            (await getUserFromPhone(messagePhoneNumber));

        if (
            isUserAllowed(user, [
                USER_GROUPS.YOUTUBE_PREMIUM,
                USER_GROUPS.ADMIN,
            ])
        ) {
            const tanda = await getTandaByName(USER_GROUPS.YOUTUBE_PREMIUM);

            const messages = generateYoutubePremiumRulesMessage(tanda);

            await flowDynamic(messages.join("\n"));

            if (
                user.id !== "admin" &&
                !hasUserAcceptedTandaTerms(USER_GROUPS.YOUTUBE_PREMIUM, user)
            ) {
                await state.update({
                    tandaToAcceptTerms: USER_GROUPS.YOUTUBE_PREMIUM,
                });
                return gotoFlow(acceptTermsHandler);
            }
        } else {
            await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
        }
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const youtubePremiumStatusFlow = addKeyword<Provider, Database>(
    BOT_COMMANDS.MY_YOUTUBE,
).addAction(async (ctx, { flowDynamic }) => {
    try {
        const messagePhoneNumber = getCleanPhoneNumber(ctx.key.remoteJid!);
        const userFrom = ctx.from;
        const user =
            (await getUserFromPhone(userFrom)) ||
            (await getUserFromPhone(messagePhoneNumber));
        const tanda = await getTandaByName(USER_GROUPS.YOUTUBE_PREMIUM);
        const currentDatetime = new Date();
        const currentMonthTandaDate = new Date(
            Date.UTC(
                currentDatetime.getFullYear(),
                currentDatetime.getMonth(),
                tanda.paymentDay.getDate() + 1,
            ),
        );
        const messages: string[] = [];

        if (isUserAllowed(user, [USER_GROUPS.YOUTUBE_PREMIUM])) {
            if (!hasUserAcceptedTandaTerms(USER_GROUPS.YOUTUBE_PREMIUM, user)) {
                await flowDynamic(
                    GENERIC_USER_HAS_NOT_ACCEPTED_TERMS_MESSAGE(
                        USER_GROUPS.YOUTUBE_PREMIUM,
                    ),
                );
                return;
            }

            logger.info(
                `${user.name} is checking the status of their Youtube Premium payments`,
            );

            const lastUserPayments = await getLastUserTandaPayments(
                user.id,
                USER_GROUPS.YOUTUBE_PREMIUM,
            );

            if (lastUserPayments.length > 0) {
                if (lastUserPayments[0].nextPayment <= currentMonthTandaDate) {
                    const missingPayments = await getUserMissingPayments(
                        tanda,
                        user,
                        currentDatetime,
                        tanda.suscriptionType as SUSCRIPTION_TYPES,
                    );

                    messages.push(
                        `¡Este mes *necesitas realizar tu pago* de Youtube Premium 👀! Tienes pendientes ${missingPayments} pago${
                            missingPayments > 1 ? "s" : ""
                        }`,
                    );
                } else {
                    messages.push(
                        `¡Estas *al corriente* con tus pagos de Youtube Premium! 🎉\nTu siguiente pago debe ser antes del *${lastUserPayments[0].nextPayment.toLocaleDateString(
                            "es-MX",
                        )}*`,
                    );
                }
                messages.push(
                    "A continuación muestro tus últimos pagos de Youtube Premium 🎥:",
                );

                lastUserPayments.forEach((paymentInfo) => {
                    messages.push(
                        `📅 ${paymentInfo.paymentDate.toLocaleDateString(
                            "es-MX",
                        )} - 💵 ${pesosFormatter.format(
                            paymentInfo.payment,
                        )} pesos - ⏳ ${paymentInfo.paidPeriods} mes${
                            paymentInfo.paidPeriods > 1 ? "es" : ""
                        } pagado${paymentInfo.paidPeriods > 1 ? "s" : ""}`,
                    );
                });
            } else {
                messages.push(
                    "😰 Aún no has hecho ningún pago, si crees que esto es un error por favor avisame a mi numero personal!",
                );
            }
            await flowDynamic(messages);
        } else {
            await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
        }
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});
