import { addKeyword, EVENTS } from "@builderbot/bot";
import type { BotContext, BotStateStandAlone } from "@builderbot/bot/dist/types";
import { JsonFileDB as Database } from "@builderbot/database-json";
import { BaileysProvider as Provider } from "@builderbot/provider-baileys";

import {
    GENERIC_ERROR_MESSAGE,
    GENERIC_NOT_AUTHORIZED_MESSAGE,
    GENERIC_USER_HAS_NOT_ACCEPTED_TERMS_MESSAGE,
    OPERATION_CANCELLED_MESSAGE,
} from "@constants/messages";
import { generateTandaRulesMessages } from "@constants/tandasRules";
import { BOT_COMMANDS } from "@enums/bot-commands";
import { SUSCRIPTION_TYPES } from "@enums/suscriptions";
import type { Tanda } from "@custom-types/notion/tandasDB";
import type { Payment } from "@custom-types/payments";
import { getTandaByName } from "@utils/notion/tandasDB";
import { upsertUserTandaLegal } from "@utils/notion/legalsDB";
import {
    hasUserAcceptedTandaTerms,
    isUserAllowed,
    sendMessagesToAdmins,
} from "@utils/users";
import { getUserDebtInfo, handleTandaPayment } from "@utils/tandas";
import { savePaymentPhoto } from "@utils/files";
import { pesosFormatter } from "@utils/misc";
import { formatMexicoCityDate, getTenureText } from "@utils/datetimes";
import {
    isCancelCommand,
    resolveUserFromContext,
    withCancelInstruction,
    withTyping,
} from "@utils/flowHelpers";
import { resetIdle, startIdle, stopIdle } from "./idleFlow";
import logger from "@utils/logger";

const extractTandaFromCommandOrState = async (
    ctx: BotContext,
    state: Pick<BotStateStandAlone, "get">,
    prefixRegex: RegExp,
): Promise<Tanda | null> => {
    const stateTandaName = await state.get<string | undefined>(
        "selectedTandaName",
    );
    if (stateTandaName) {
        return getTandaByName(stateTandaName);
    }

    const match = prefixRegex.exec((ctx.body || "").trim());
    if (match?.[1]) {
        return getTandaByName(match[1].trim());
    }

    return null;
};

export const tandaPaymentInfoFlow = addKeyword<Provider, Database>(
    BOT_COMMANDS.PAYMENT_DETAILS,
).addAction(async (ctx, { flowDynamic, provider }) => {
    try {
        await withTyping(ctx, provider, async () => {
            const user = await resolveUserFromContext(ctx);

            if (isUserAllowed(user)) {
                const messages: string[] = [
                    "📄 *Datos de pago para tu tanda:*",
                    "👤 *Nombre*: Christian Alejandro Leyva Mercado",
                    "🏦 *Banco*: NU MEXICO",
                    "🔑 *CLABE*: 6381 8000 0110 380148",
                ];

                await flowDynamic(messages.join("\n"));
            } else {
                await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
            }
        });
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const acceptTermsHandler = addKeyword<Provider, Database>(EVENTS.ACTION)
    .addAction(async (ctx, { gotoFlow }) => {
        startIdle(ctx, gotoFlow);
    })
    .addAnswer(
        withCancelInstruction(
            "Para aceptar el reglamento, escribe *ACEPTO*. De lo contrario, envía *NO ACEPTO* y contacta al administrador de tu tanda para aclarar dudas.",
        ),
        { capture: true },
        async (ctx, { flowDynamic, fallBack, endFlow, state, provider }) => {
            stopIdle(ctx);
            const userResponse = (ctx.body || "").trim();

            if (isCancelCommand(userResponse)) {
                await state.clear();
                return endFlow(OPERATION_CANCELLED_MESSAGE);
            }

            if (userResponse.toUpperCase() === "NO ACEPTO") {
                await state.clear();
                return endFlow(
                    "Entendido, si tienes alguna duda contacta al administrador de tu tanda.",
                );
            }

            if (userResponse.toUpperCase() !== "ACEPTO") {
                return fallBack(
                    withCancelInstruction(
                        "Respuesta no válida. Por favor escribe *ACEPTO* o *NO ACEPTO*.",
                    ),
                );
            }

            try {
                await withTyping(ctx, provider, async () => {
                    const user = await resolveUserFromContext(ctx);
                    const tandaId = await state.get<string>(
                        "tandaIdToAcceptTerms",
                    );
                    const tandaName = await state.get<string>(
                        "tandaToAcceptTerms",
                    );

                    if (!user || !tandaId || !tandaName) {
                        await flowDynamic(GENERIC_ERROR_MESSAGE);
                        return;
                    }

                    await upsertUserTandaLegal({
                        userId: user.id,
                        userName: user.name,
                        tandaId,
                        tandaName,
                        acceptedRules: true,
                    });

                    await state.clear();
                    await flowDynamic(
                        `¡Gracias por aceptar el reglamento de *${tandaName}*! 🎉 Ya puedes usar \`pagar ${tandaName.toLowerCase()}\` y \`mi ${tandaName.toLowerCase()}\`.`,
                    );
                });
            } catch (error) {
                logger.error(error);
                await flowDynamic(GENERIC_ERROR_MESSAGE);
            }
        },
    );

export const tandaPaymentHandler = addKeyword<Provider, Database>(EVENTS.ACTION)
    .addAction(async (ctx, { gotoFlow }) => {
        startIdle(ctx, gotoFlow);
    })
    .addAnswer(
        withCancelInstruction(
            "💲 Escribe el monto *únicamente con números* del pago que realizaste (ej. `180` o `40.50`):",
        ),
        { capture: true },
        async (ctx, { fallBack, endFlow, state, gotoFlow }) => {
            if (isCancelCommand(ctx.body)) {
                stopIdle(ctx);
                await state.clear();
                return endFlow(OPERATION_CANCELLED_MESSAGE);
            }

            const cleaned = (ctx.body || "").replace(/[$,\s]/g, "");
            const amount = Number(cleaned);

            if (!cleaned || Number.isNaN(amount) || amount <= 0) {
                resetIdle(ctx, gotoFlow);
                return fallBack(
                    withCancelInstruction(
                        "❌ Ingresaste un monto inválido. Escribe únicamente números mayores a 0 (ej. `40` o `40.50`):",
                    ),
                );
            }

            resetIdle(ctx, gotoFlow);
            await state.update({ amount });
        },
    )
    .addAnswer(
        withCancelInstruction(
            "🧾 Ahora envía la *foto o archivo (PDF)* de tu comprobante de pago:",
        ),
        { capture: true },
        async (ctx, { flowDynamic, fallBack, endFlow, provider, state, gotoFlow }) => {
            if (isCancelCommand(ctx.body)) {
                stopIdle(ctx);
                await state.clear();
                return endFlow(OPERATION_CANCELLED_MESSAGE);
            }

            const hasMedia = Boolean(
                ctx.message?.imageMessage || ctx.message?.documentMessage,
            );

            if (!hasMedia) {
                resetIdle(ctx, gotoFlow);
                return fallBack(
                    withCancelInstruction(
                        "❌ No detecté una imagen o archivo PDF. Por favor envía la foto o documento de tu comprobante:",
                    ),
                );
            }

            stopIdle(ctx);

            try {
                await withTyping(ctx, provider, async () => {
                    const user = await resolveUserFromContext(ctx);
                    const tandaName = await state.get<string>(
                        "paymentTandaName",
                    );
                    const amount = await state.get<number>("amount");

                    if (!user || !tandaName || !amount) {
                        await flowDynamic(GENERIC_ERROR_MESSAGE);
                        return;
                    }

                    const voucherPath = await savePaymentPhoto(
                        ctx,
                        provider,
                        user.id,
                    );

                    const payment: Payment = {
                        paymentDate: new Date(),
                        amount,
                        user,
                        tanda: tandaName,
                        voucherPath,
                    };

                    const {
                        paidPeriods,
                        nextPayment,
                        newCreditBalance,
                        tandaInfo,
                    } = await handleTandaPayment(payment);

                    const periodUnit =
                        tandaInfo.suscriptionType === SUSCRIPTION_TYPES.ANNUAL
                            ? paidPeriods === 1
                                ? "año"
                                : "años"
                            : paidPeriods === 1
                              ? "mes"
                              : "meses";

                    logger.info(
                        `${user.name} paid ${pesosFormatter.format(amount)} -> ${paidPeriods} ${periodUnit} of ${tandaInfo.name} (credit: ${newCreditBalance})`,
                    );

                    if (paidPeriods > 0) {
                        await flowDynamic(
                            `✅ ¡Listo! Se registró tu pago de *${pesosFormatter.format(amount)}* para *${tandaInfo.name}* (${paidPeriods} ${periodUnit}).\n📅 Tu próximo pago será el *${formatMexicoCityDate(nextPayment)}*.\n💰 Saldo a favor restante: *${pesosFormatter.format(newCreditBalance)}*.`,
                        );
                    } else {
                        const missingForOne = Math.max(
                            0,
                            tandaInfo.costPerUser - newCreditBalance,
                        );
                        await flowDynamic(
                            `✅ Se registró tu abono parcial de *${pesosFormatter.format(amount)}* para *${tandaInfo.name}*.\n💰 Tu saldo a favor acumulado es de *${pesosFormatter.format(newCreditBalance)}*.\nℹ️ Te faltan *${pesosFormatter.format(missingForOne)}* para completar 1 periodo (${pesosFormatter.format(tandaInfo.costPerUser)}).`,
                        );
                    }

                    await sendMessagesToAdmins([
                        {
                            body: `${user.name} realizó un pago de *${pesosFormatter.format(amount)}* para *${tandaInfo.name}* (${paidPeriods} ${periodUnit}, saldo a favor: ${pesosFormatter.format(newCreditBalance)}).`,
                        },
                        {
                            type: "image",
                            body: voucherPath,
                            alt: `Comprobante de ${user.name} (${tandaInfo.name})`,
                        },
                    ]);

                    await state.clear();
                });
            } catch (error) {
                logger.error(error);
                await state.clear();
                await flowDynamic(GENERIC_ERROR_MESSAGE);
            }
        },
    );

export const tandaPaymentEntryFlow = addKeyword<Provider, Database>(
    "/^pagar\\s+(.+)$/i",
    { regex: true },
).addAction(async (ctx, { flowDynamic, gotoFlow, state, provider }) => {
    try {
        await withTyping(ctx, provider, async () => {
            const user = await resolveUserFromContext(ctx);
            const tanda = await extractTandaFromCommandOrState(
                ctx,
                state,
                /^pagar\s+(.+)$/i,
            );
            await state.update({ selectedTandaName: undefined });

            if (!tanda) {
                await flowDynamic(
                    "🤔 No encontré esa tanda. Envía `menú` para ver tus tandas disponibles.",
                );
                return;
            }

            if (!isUserAllowed(user, { tandaId: tanda.id })) {
                await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
                return;
            }

            if (!(await hasUserAcceptedTandaTerms(user!.id, tanda.id))) {
                await flowDynamic(
                    GENERIC_USER_HAS_NOT_ACCEPTED_TERMS_MESSAGE(tanda.name),
                );
                return;
            }

            logger.info(`${user!.name} is making a payment for ${tanda.name}`);
            await state.update({ paymentTandaName: tanda.name });
            return gotoFlow(tandaPaymentHandler);
        });
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const tandaStatusFlow = addKeyword<Provider, Database>(
    "/^mi\\s+(.+)$/i",
    { regex: true },
).addAction(async (ctx, { flowDynamic, state, provider }) => {
    try {
        await withTyping(ctx, provider, async () => {
            const user = await resolveUserFromContext(ctx);
            const tanda = await extractTandaFromCommandOrState(
                ctx,
                state,
                /^mi\s+(.+)$/i,
            );
            await state.update({ selectedTandaName: undefined });

            if (!tanda) {
                await flowDynamic(
                    "🤔 No encontré esa tanda. Envía `menú` para ver tus tandas disponibles.",
                );
                return;
            }

            if (!isUserAllowed(user, { tandaId: tanda.id })) {
                await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
                return;
            }

            if (!(await hasUserAcceptedTandaTerms(user!.id, tanda.id))) {
                await flowDynamic(
                    GENERIC_USER_HAS_NOT_ACCEPTED_TERMS_MESSAGE(tanda.name),
                );
                return;
            }

            const now = new Date();
            const debt = await getUserDebtInfo(tanda, user!, now);
            const messages: string[] = [];

            const periodSingular =
                tanda.suscriptionType === SUSCRIPTION_TYPES.ANNUAL
                    ? "año"
                    : "mes";
            const periodPlural =
                tanda.suscriptionType === SUSCRIPTION_TYPES.ANNUAL
                    ? "años"
                    : "meses";

            if (debt.startDate) {
                const tenure = getTenureText(debt.startDate, now);
                messages.push(
                    `📆 Estás en *${tanda.name}* desde el *${formatMexicoCityDate(debt.startDate)}* (llevas *${tenure}*).`,
                );
            }

            if (debt.missingPayments > 0) {
                const unitCost = pesosFormatter.format(tanda.costPerUser);
                const totalOwed = pesosFormatter.format(debt.totalAmountOwed);
                const periodText =
                    debt.missingPayments === 1 ? periodSingular : periodPlural;

                messages.push(
                    `👀 Tienes *${debt.missingPayments} ${periodText}* pendiente(s) en *${tanda.name}* (${debt.missingPayments} × ${unitCost}${
                        debt.creditBalance > 0
                            ? ` - ${pesosFormatter.format(debt.creditBalance)} de saldo a favor`
                            : ""
                    }).\n💵 *Total a pagar:* *${totalOwed} pesos*`,
                );
            } else if (debt.nextPayment) {
                messages.push(
                    `¡Estás *al corriente* con tus pagos de *${tanda.name}*! 🎉\n📅 Tu siguiente pago debe ser antes del *${formatMexicoCityDate(debt.nextPayment)}*`,
                );
            }

            messages.push(
                `💰 *Saldo a favor actual:* *${pesosFormatter.format(debt.creditBalance)} pesos*`,
            );

            if (debt.lastPayments.length > 0) {
                const historyLines = [
                    `A continuación muestro tus últimos pagos de *${tanda.name}*:`,
                ];
                debt.lastPayments.forEach((p) => {
                    const periodsText =
                        p.paidPeriods !== undefined
                            ? `${p.paidPeriods} ${p.paidPeriods === 1 ? periodSingular : periodPlural}`
                            : "-";
                    historyLines.push(
                        `📅 ${formatMexicoCityDate(p.paymentDate)} - 💵 ${pesosFormatter.format(p.payment)} - ⏳ ${periodsText}`,
                    );
                });
                messages.push(historyLines.join("\n"));
            } else {
                messages.push(
                    "ℹ️ Aún no tienes pagos registrados en esta tanda. Envía `pagar " +
                        tanda.name.toLowerCase() +
                        "` cuando realices tu transferencia.",
                );
            }

            await flowDynamic(messages);
        });
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const tandaRulesFlow = addKeyword<Provider, Database>(
    "/^reglamento\\s+(.+)$/i",
    { regex: true },
).addAction(async (ctx, { flowDynamic, gotoFlow, state, provider }) => {
    try {
        await withTyping(ctx, provider, async () => {
            const user = await resolveUserFromContext(ctx);
            const tanda = await extractTandaFromCommandOrState(
                ctx,
                state,
                /^reglamento\s+(.+)$/i,
            );
            await state.update({ selectedTandaName: undefined });

            if (!tanda) {
                await flowDynamic(
                    "🤔 No encontré esa tanda. Envía `menú` para ver tus tandas disponibles.",
                );
                return;
            }

            if (!isUserAllowed(user, { tandaId: tanda.id })) {
                await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
                return;
            }

            const messages = generateTandaRulesMessages(tanda);
            await flowDynamic(messages);

            const accepted = await hasUserAcceptedTandaTerms(user!.id, tanda.id);
            if (!accepted) {
                await state.update({
                    tandaIdToAcceptTerms: tanda.id,
                    tandaToAcceptTerms: tanda.name,
                });
                return gotoFlow(acceptTermsHandler);
            }
        });
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});
