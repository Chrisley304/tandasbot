import { addKeyword, EVENTS } from "@builderbot/bot";
import { JsonFileDB as Database } from "@builderbot/database-json";
import { BaileysProvider as Provider } from "@builderbot/provider-baileys";

import {
    GENERIC_ERROR_MESSAGE,
    GENERIC_NOT_AUTHORIZED_MESSAGE,
    OPERATION_CANCELLED_MESSAGE,
} from "@constants/messages";
import { BOT_COMMANDS } from "@enums/bot-commands";
import { SUSCRIPTION_TYPES } from "@enums/suscriptions";
import type { User } from "@custom-types/notion/usersDB";
import { getActiveTandas, getTandaByName, getTandaValidPayments } from "@utils/notion/tandasDB";
import { getUserFromName } from "@utils/notion/usersDB";
import {
    adjustTandaPriceAndAdvancePayments,
    getDebtorsFromTanda,
    getTotalMoneyFromTandaPayments,
    getUserDetailedDebtSummary,
    handleDailyTandasReminders,
    updateTandaPasswordAndNotify,
} from "@utils/tandas";
import {
    isUserAllowed,
    sendMessagesToUser,
    sendMessageToTandaGroup,
} from "@utils/users";
import { normalizeTandaName, pesosFormatter } from "@utils/misc";
import { formatMexicoCityDate } from "@utils/datetimes";
import {
    isCancelCommand,
    resolveUserFromContext,
    withCancelInstruction,
    withTyping,
} from "@utils/flowHelpers";
import { resetIdle, startIdle, stopIdle } from "./idleFlow";
import logger from "@utils/logger";

export const messageToGroupHandler = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { gotoFlow }) => {
        startIdle(ctx, gotoFlow);
    })
    .addAnswer(
        withCancelInstruction(
            "👥 Escribe el nombre de la tanda a la que deseas enviar el mensaje (o escribe `todos` para enviarlo a todos los grupos):",
        ),
        { capture: true },
        async (ctx, { fallBack, endFlow, state, gotoFlow, provider }) => {
            if (isCancelCommand(ctx.body)) {
                stopIdle(ctx);
                await state.clear();
                return endFlow(OPERATION_CANCELLED_MESSAGE);
            }

            const rawTarget = (ctx.body || "").trim();
            const normalized = normalizeTandaName(rawTarget);

            if (normalized === "todos") {
                resetIdle(ctx, gotoFlow);
                await state.update({ groupName: "todos" });
                return;
            }

            const tanda = await withTyping(ctx, provider, () =>
                getTandaByName(rawTarget),
            );
            if (tanda) {
                resetIdle(ctx, gotoFlow);
                await state.update({ groupName: tanda.name });
            } else {
                resetIdle(ctx, gotoFlow);
                return fallBack(
                    withCancelInstruction(
                        "😰 No encontré esa tanda. Escribe el nombre de la tanda o `todos`:",
                    ),
                );
            }
        },
    )
    .addAnswer(
        withCancelInstruction("✉️ Escribe el mensaje que deseas enviar al grupo:"),
        { capture: true },
        async (ctx, { flowDynamic, fallBack, endFlow, state, gotoFlow, provider }) => {
            if (isCancelCommand(ctx.body)) {
                stopIdle(ctx);
                await state.clear();
                return endFlow(OPERATION_CANCELLED_MESSAGE);
            }

            const message = (ctx.body || "").trim();
            if (message.length < 3) {
                resetIdle(ctx, gotoFlow);
                return fallBack(
                    withCancelInstruction(
                        "❌ El mensaje no puede ser menor a 3 letras. Intenta de nuevo:",
                    ),
                );
            }

            stopIdle(ctx);
            try {
                await withTyping(ctx, provider, async () => {
                    const groupName = state.get<string>("groupName");
                    const { sentCount, targetLabel } =
                        await sendMessageToTandaGroup(groupName, message);
                    await state.clear();
                    await flowDynamic(
                        `✅ Mensaje enviado correctamente a *${targetLabel}* (${sentCount} usuario(s)).`,
                    );
                });
            } catch (error) {
                logger.error(error);
                await state.clear();
                await flowDynamic(GENERIC_ERROR_MESSAGE);
            }
        },
    );

export const sendMessageToGroupFlow = addKeyword<Provider, Database>(
    [BOT_COMMANDS.SEND_GROUP_MESSAGE],
    { sensitive: true },
).addAction(async (ctx, { flowDynamic, gotoFlow, provider }) => {
    try {
        await withTyping(ctx, provider, async () => {
            const user = await resolveUserFromContext(ctx);
            if (isUserAllowed(user, { requireAdmin: true })) {
                return gotoFlow(messageToGroupHandler);
            }
            await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
        });
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const sendMessageToUserHandler = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { gotoFlow }) => {
        startIdle(ctx, gotoFlow);
    })
    .addAnswer(
        withCancelInstruction(
            "👤 Escribe el *nombre* del usuario al que deseas enviar el mensaje:",
        ),
        { capture: true },
        async (ctx, { fallBack, endFlow, state, gotoFlow, provider }) => {
            if (isCancelCommand(ctx.body)) {
                stopIdle(ctx);
                await state.clear();
                return endFlow(OPERATION_CANCELLED_MESSAGE);
            }

            const targetUser = await withTyping(ctx, provider, () =>
                getUserFromName(ctx.body),
            );
            if (!targetUser) {
                resetIdle(ctx, gotoFlow);
                return fallBack(
                    withCancelInstruction(
                        "😰 No encontré ese usuario en Notion. Intenta de nuevo:",
                    ),
                );
            }

            resetIdle(ctx, gotoFlow);
            await state.update({ userToSendMsg: targetUser });
        },
    )
    .addAnswer(
        withCancelInstruction("✉️ Escribe el mensaje que deseas enviar al usuario:"),
        { capture: true },
        async (ctx, { flowDynamic, fallBack, endFlow, state, gotoFlow, provider }) => {
            if (isCancelCommand(ctx.body)) {
                stopIdle(ctx);
                await state.clear();
                return endFlow(OPERATION_CANCELLED_MESSAGE);
            }

            const message = (ctx.body || "").trim();
            if (message.length < 3) {
                resetIdle(ctx, gotoFlow);
                return fallBack(
                    withCancelInstruction(
                        "❌ El mensaje no puede ser menor a 3 letras. Intenta de nuevo:",
                    ),
                );
            }

            stopIdle(ctx);
            try {
                await withTyping(ctx, provider, async () => {
                    const targetUser = state.get<User>("userToSendMsg");
                    await sendMessagesToUser(targetUser, [{ body: message }]);
                    await state.clear();
                    await flowDynamic(
                        `✅ Mensaje enviado correctamente a *${targetUser.name}*.`,
                    );
                });
            } catch (error) {
                logger.error(error);
                await state.clear();
                await flowDynamic(GENERIC_ERROR_MESSAGE);
            }
        },
    );

export const sendMessageToUserFlow = addKeyword<Provider, Database>(
    [BOT_COMMANDS.SEND_CUSTOM_MESSAGE],
    { sensitive: true },
).addAction(async (ctx, { flowDynamic, gotoFlow, provider }) => {
    try {
        await withTyping(ctx, provider, async () => {
            const user = await resolveUserFromContext(ctx);
            if (isUserAllowed(user, { requireAdmin: true })) {
                return gotoFlow(sendMessageToUserHandler);
            }
            await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
        });
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const getTandasStatusFlow = addKeyword<Provider, Database>(
    BOT_COMMANDS.TANDA_STATUS,
).addAction(async (ctx, { flowDynamic, provider }) => {
    try {
        await withTyping(ctx, provider, async () => {
            const user = await resolveUserFromContext(ctx);
            if (!isUserAllowed(user, { requireAdmin: true })) {
                await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
                return;
            }

            const tandas = await getActiveTandas(true);
            const currentDatetime = new Date();
            const messages: string[] = [];

            for (const tanda of tandas) {
                const debtors = await getDebtorsFromTanda(tanda, currentDatetime);
                const validPayments = await getTandaValidPayments(tanda.id);
                const totalMoney = getTotalMoneyFromTandaPayments(
                    tanda,
                    validPayments,
                );
                const periodWord =
                    tanda.suscriptionType === SUSCRIPTION_TYPES.ANNUAL
                        ? "año(s)"
                        : "mes(es)";

                const lines = [
                    `📊 *Tanda:* ${tanda.name}`,
                    `💰 *Costo tanda:* ${pesosFormatter.format(tanda.totalCost)} (${pesosFormatter.format(tanda.costPerUser)} / miembro)`,
                    `💵 *Dinero adelantado en cuenta:* ${pesosFormatter.format(totalMoney)}`,
                    debtors.length > 0
                        ? `🚨 *Deudores (${debtors.length}):*\n` +
                          debtors
                              .map(
                                  (d) =>
                                      `  - ${d.user.name}: ${d.missingPayments} ${periodWord} (${pesosFormatter.format(d.totalAmountOwed)})`,
                              )
                              .join("\n")
                        : "✅ Sin deudores al corriente.",
                ];

                messages.push(lines.join("\n"));
            }

            if (messages.length === 0) {
                await flowDynamic("ℹ️ No hay tandas activas registradas.");
            } else {
                await flowDynamic(messages);
            }
        });
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const sendDailyRemindersFlow = addKeyword<Provider, Database>(
    BOT_COMMANDS.RESEND_TANDA_REMINDERS,
).addAction(async (ctx, { flowDynamic, provider }) => {
    try {
        await withTyping(ctx, provider, async () => {
            const user = await resolveUserFromContext(ctx);
            if (!isUserAllowed(user, { requireAdmin: true })) {
                await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
                return;
            }

            await handleDailyTandasReminders();
            await flowDynamic(
                "✅ Proceso de recordatorios diarios ejecutado correctamente.",
            );
        });
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const userDebtLookupHandler = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { gotoFlow }) => {
        startIdle(ctx, gotoFlow);
    })
    .addAnswer(
        withCancelInstruction(
            "🔍 Escribe el *nombre* del usuario del que deseas consultar sus adeudos:",
        ),
        { capture: true },
        async (ctx, { flowDynamic, fallBack, endFlow, state, gotoFlow, provider }) => {
            if (isCancelCommand(ctx.body)) {
                stopIdle(ctx);
                await state.clear();
                return endFlow(OPERATION_CANCELLED_MESSAGE);
            }

            try {
                const targetUser = await withTyping(ctx, provider, () =>
                    getUserFromName(ctx.body),
                );
                if (!targetUser) {
                    resetIdle(ctx, gotoFlow);
                    return fallBack(
                        withCancelInstruction(
                            "😰 No encontré ese usuario en Notion. Intenta con otro nombre:",
                        ),
                    );
                }

                stopIdle(ctx);
                await withTyping(ctx, provider, async () => {
                    const summary = await getUserDetailedDebtSummary(targetUser);
                    await state.clear();
                    await flowDynamic(summary);
                });
            } catch (error) {
                stopIdle(ctx);
                logger.error(error);
                await state.clear();
                await flowDynamic(GENERIC_ERROR_MESSAGE);
            }
        },
    );

export const userDebtLookupFlow = addKeyword<Provider, Database>(
    [BOT_COMMANDS.USER_DEBTS],
    { sensitive: true },
).addAction(async (ctx, { flowDynamic, gotoFlow, provider }) => {
    try {
        await withTyping(ctx, provider, async () => {
            const user = await resolveUserFromContext(ctx);
            if (isUserAllowed(user, { requireAdmin: true })) {
                return gotoFlow(userDebtLookupHandler);
            }
            await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
        });
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const changeTandaPriceHandler = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { gotoFlow }) => {
        startIdle(ctx, gotoFlow);
    })
    .addAnswer(
        withCancelInstruction(
            "💲 Escribe el *nombre de la tanda* a la que deseas cambiar el precio total:",
        ),
        { capture: true },
        async (ctx, { fallBack, endFlow, state, gotoFlow, provider }) => {
            if (isCancelCommand(ctx.body)) {
                stopIdle(ctx);
                await state.clear();
                return endFlow(OPERATION_CANCELLED_MESSAGE);
            }

            const tanda = await withTyping(ctx, provider, () =>
                getTandaByName(ctx.body),
            );
            if (!tanda) {
                resetIdle(ctx, gotoFlow);
                return fallBack(
                    withCancelInstruction(
                        "😰 No encontré esa tanda. Intenta de nuevo:",
                    ),
                );
            }

            resetIdle(ctx, gotoFlow);
            await state.update({
                priceTandaId: tanda.id,
                priceTandaName: tanda.name,
                priceOldTotal: tanda.totalCost,
                priceMembers: tanda.nMembers,
            });
        },
    )
    .addAnswer(
        withCancelInstruction(
            "💵 Escribe el *nuevo costo total* de la tanda (solo números, ej. `249`):",
        ),
        { capture: true },
        async (ctx, { flowDynamic, fallBack, endFlow, state, gotoFlow, provider }) => {
            if (isCancelCommand(ctx.body)) {
                stopIdle(ctx);
                await state.clear();
                return endFlow(OPERATION_CANCELLED_MESSAGE);
            }

            const cleaned = (ctx.body || "").replace(/[$,\s]/g, "");
            const newTotalCost = Number(cleaned);
            if (!cleaned || Number.isNaN(newTotalCost) || newTotalCost <= 0) {
                resetIdle(ctx, gotoFlow);
                return fallBack(
                    withCancelInstruction(
                        "❌ Monto inválido. Escribe solo números mayores a 0:",
                    ),
                );
            }

            stopIdle(ctx);
            try {
                await withTyping(ctx, provider, async () => {
                    const tandaId = state.get<string>("priceTandaId");
                    const result = await adjustTandaPriceAndAdvancePayments(
                        tandaId,
                        newTotalCost,
                    );
                    await state.clear();

                    const lines = [
                        `✅ Precio de *${result.tandaName}* actualizado.`,
                        `• Cuota anterior: ${pesosFormatter.format(result.oldCostPerUser)} → Nueva cuota: *${pesosFormatter.format(result.newCostPerUser)}*`,
                    ];

                    if (result.adjustedUsers.length > 0) {
                        lines.push("• *Pagos adelantados ajustados:*");
                        for (const adj of result.adjustedUsers) {
                            lines.push(
                                `  - ${adj.userName}: ${formatMexicoCityDate(adj.oldNextPayment)} → *${formatMexicoCityDate(adj.newNextPayment)}* (saldo a favor: ${pesosFormatter.format(adj.newCreditBalance)})`,
                            );
                        }
                    } else {
                        lines.push("• No hubo usuarios con pagos adelantados por ajustar.");
                    }

                    await flowDynamic(lines.join("\n"));
                });
            } catch (error) {
                logger.error(error);
                await state.clear();
                await flowDynamic(GENERIC_ERROR_MESSAGE);
            }
        },
    );

export const changeTandaPriceFlow = addKeyword<Provider, Database>(
    [BOT_COMMANDS.CHANGE_TANDA_PRICE],
    { sensitive: true },
).addAction(async (ctx, { flowDynamic, gotoFlow, provider }) => {
    try {
        await withTyping(ctx, provider, async () => {
            const user = await resolveUserFromContext(ctx);
            if (isUserAllowed(user, { requireAdmin: true })) {
                return gotoFlow(changeTandaPriceHandler);
            }
            await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
        });
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});

export const changeTandaPasswordHandler = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { gotoFlow }) => {
        startIdle(ctx, gotoFlow);
    })
    .addAnswer(
        withCancelInstruction(
            "🔐 Escribe el *nombre de la tanda* a la que deseas cambiar la contraseña:",
        ),
        { capture: true },
        async (ctx, { fallBack, endFlow, state, gotoFlow, provider }) => {
            if (isCancelCommand(ctx.body)) {
                stopIdle(ctx);
                await state.clear();
                return endFlow(OPERATION_CANCELLED_MESSAGE);
            }

            const tanda = await withTyping(ctx, provider, () =>
                getTandaByName(ctx.body),
            );
            if (!tanda) {
                resetIdle(ctx, gotoFlow);
                return fallBack(
                    withCancelInstruction(
                        "😰 No encontré esa tanda. Intenta de nuevo:",
                    ),
                );
            }

            resetIdle(ctx, gotoFlow);
            await state.update({ passwordTandaId: tanda.id });
        },
    )
    .addAnswer(
        withCancelInstruction("🔑 Escribe la *nueva contraseña* para la tanda:"),
        { capture: true },
        async (ctx, { flowDynamic, fallBack, endFlow, state, gotoFlow, provider }) => {
            if (isCancelCommand(ctx.body)) {
                stopIdle(ctx);
                await state.clear();
                return endFlow(OPERATION_CANCELLED_MESSAGE);
            }

            const newPassword = (ctx.body || "").trim();
            if (newPassword.length < 3) {
                resetIdle(ctx, gotoFlow);
                return fallBack(
                    withCancelInstruction(
                        "❌ La contraseña debe tener al menos 3 caracteres. Intenta de nuevo:",
                    ),
                );
            }

            stopIdle(ctx);
            try {
                await withTyping(ctx, provider, async () => {
                    const tandaId = state.get<string>("passwordTandaId");
                    const result = await updateTandaPasswordAndNotify(
                        tandaId,
                        newPassword,
                    );
                    await state.clear();

                    const lines = [
                        `✅ Contraseña de *${result.tandaName}* actualizada en Notion.`,
                        result.sentTo.length > 0
                            ? `📩 *Enviada a (${result.sentTo.length}):* ${result.sentTo.join(", ")}`
                            : "📩 *Enviada a:* Ningún miembro (todos tienen adeudo).",
                        result.skippedDebtors.length > 0
                            ? `🚫 *No enviada por adeudo (${result.skippedDebtors.length}):* ${result.skippedDebtors.join(", ")}`
                            : "✅ Ningún miembro omitido.",
                    ];

                    await flowDynamic(lines.join("\n"));
                });
            } catch (error) {
                logger.error(error);
                await state.clear();
                await flowDynamic(GENERIC_ERROR_MESSAGE);
            }
        },
    );

export const changeTandaPasswordFlow = addKeyword<Provider, Database>(
    [
        BOT_COMMANDS.CHANGE_TANDA_PASSWORD,
        BOT_COMMANDS.CHANGE_TANDA_PASSWORD_WITHOUT_TILDE,
    ],
    { sensitive: true },
).addAction(async (ctx, { flowDynamic, gotoFlow, provider }) => {
    try {
        await withTyping(ctx, provider, async () => {
            const user = await resolveUserFromContext(ctx);
            if (isUserAllowed(user, { requireAdmin: true })) {
                return gotoFlow(changeTandaPasswordHandler);
            }
            await flowDynamic(GENERIC_NOT_AUTHORIZED_MESSAGE);
        });
    } catch (error) {
        logger.error(error);
        await flowDynamic(GENERIC_ERROR_MESSAGE);
    }
});
