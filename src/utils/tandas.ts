import type { Deptor } from "@custom-types/debtors";
import type { Tanda } from "@custom-types/notion/tandasDB";
import type { TandaPayment } from "@custom-types/notion/paymentsDB";
import type { Payment } from "@custom-types/payments";
import type { User } from "@custom-types/notion/usersDB";
import type { UserTandaLegal } from "@custom-types/notion/legalsDB";

import { SUSCRIPTION_TYPES } from "@enums/suscriptions";
import { getAdminUsers, getUsersByTandaId } from "./notion/usersDB";
import {
    addPaymentToTanda,
    getActiveTandas,
    getLastUserTandaPayments,
    getTandaById,
    getTandaByName,
    getTandaValidPayments,
    updatePaymentNextPaymentDate,
    updateTandaPassword,
    updateTandaPrice,
} from "./notion/tandasDB";
import { getUserTandaLegal, upsertUserTandaLegal } from "./notion/legalsDB";
import {
    sendMessagesToAdmins,
    sendMessagesToUser,
    sendReminderToDebtors,
} from "./users";
import { pesosFormatter, roundCurrency } from "./misc";
import {
    compareCalendarDates,
    countDuePeriods,
    countFuturePeriods,
    formatMexicoCityDate,
    getCurrentCycleCutoffDate,
    getNextPaymentDateFromPayment,
    getTandaDaysDiff,
} from "./datetimes";
import logger from "./logger";
import { uploadFileToNotion } from "./files";

export interface UserTandaDebtInfo {
    missingPayments: number;
    totalAmountOwed: number;
    creditBalance: number;
    nextPayment: Date | null;
    startDate: Date | null;
    lastPayments: TandaPayment[];
    legal: UserTandaLegal | null;
}

/**
 * Computes exact missing periods, total money owed, credit balance, and recent payments
 * for a user in a tanda using America/Mexico_City calendar rules.
 */
export const getUserDebtInfo = async (
    tanda: Tanda,
    user: User,
    currentDatetime: Date = new Date(),
): Promise<UserTandaDebtInfo> => {
    const tandaType =
        (tanda.suscriptionType as SUSCRIPTION_TYPES) || SUSCRIPTION_TYPES.MONTHLY;

    const [lastPayments, legal] = await Promise.all([
        getLastUserTandaPayments(user.id, tanda.id, 3),
        getUserTandaLegal(user.id, tanda.id),
    ]);

    const creditBalance = roundCurrency(legal?.creditBalance ?? 0);
    const startDate = legal?.startDate ?? null;

    if (lastPayments.length === 0) {
        const dueBase =
            startDate ??
            getCurrentCycleCutoffDate(tanda.paymentDay, currentDatetime, tandaType);
        const missingPayments = countDuePeriods(
            dueBase,
            currentDatetime,
            tanda.paymentDay,
            tandaType,
        );
        const totalAmountOwed = Math.max(
            0,
            roundCurrency(missingPayments * tanda.costPerUser - creditBalance),
        );

        return {
            missingPayments,
            totalAmountOwed,
            creditBalance,
            nextPayment: dueBase,
            startDate,
            lastPayments: [],
            legal,
        };
    }

    const lastPayment = lastPayments[0];
    const missingPayments = countDuePeriods(
        lastPayment.nextPayment,
        currentDatetime,
        tanda.paymentDay,
        tandaType,
    );
    const totalAmountOwed = Math.max(
        0,
        roundCurrency(missingPayments * tanda.costPerUser - creditBalance),
    );

    return {
        missingPayments,
        totalAmountOwed,
        creditBalance,
        nextPayment: lastPayment.nextPayment,
        startDate,
        lastPayments,
        legal,
    };
};

/**
 * Returns the number of missing payments a user has for a tanda.
 *
 * @deprecated Use `getUserDebtInfo(...).missingPayments` to also obtain the
 * total owed, credit balance, payment date, and recent payment history.
 */
export const getUserMissingPayments = async (
    tanda: Tanda,
    user: User,
    currentDatetime: Date = new Date(),
): Promise<number> => {
    try {
        const info = await getUserDebtInfo(tanda, user, currentDatetime);
        return info.missingPayments;
    } catch (error) {
        logger.error(error);
        return 0;
    }
};

/**
 * Returns all debtors for a tanda (monthly or annual).
 */
export const getDebtorsFromTanda = async (
    tanda: Tanda,
    currentDatetime: Date = new Date(),
): Promise<Deptor[]> => {
    try {
        const tandaUsers = await getUsersByTandaId(tanda.id);

        const results = await Promise.all(
            tandaUsers.map(async (user) => {
                const info = await getUserDebtInfo(tanda, user, currentDatetime);
                if (info.missingPayments > 0) {
                    return {
                        missingPayments: info.missingPayments,
                        totalAmountOwed: info.totalAmountOwed,
                        creditBalance: info.creditBalance,
                        user,
                    };
                }
                return undefined;
            }),
        );

        return results.filter((el): el is Deptor => el !== undefined);
    } catch (error) {
        logger.error(error);
        return [];
    }
};

const MONTHLY_REMINDER_DAYS = new Set([5, 3, 1, 0, -2]);
const ANNUAL_REMINDER_DAYS = new Set([30, 15, 7, 1, 0, -2]);

/**
 * Checks all active tandas and sends preventive/overdue reminders to debtors.
 */
export const handleDailyTandasReminders = async () => {
    const currentDatetime = new Date();
    const activeTandas = await getActiveTandas(true);
    const admins = await getAdminUsers();

    logger.info(
        {
            event: "reminders.run.started",
            activeTandas: activeTandas.length,
            admins: admins.length,
        },
        "Evaluating daily tanda reminders",
    );

    if (admins.length > 0) {
        for (const admin of admins) {
            await sendMessagesToUser(admin, [
                {
                    body: `Hola ${admin.name}! 👋🏼. Voy a comprobar si amigos te deben y en cuyo caso enviarles un recordatorio 🤓👆🏼`,
                },
            ]);
        }
    } else {
        logger.warn("No admin users found in Notion for daily reminder summary.");
    }

    for (const tanda of activeTandas) {
        const tandaType =
            (tanda.suscriptionType as SUSCRIPTION_TYPES) ||
            SUSCRIPTION_TYPES.MONTHLY;

        const daysBetweenDates = getTandaDaysDiff(
            tanda.paymentDay,
            currentDatetime,
            tandaType,
        );

        logger.debug(
            {
                event: "reminders.tanda.evaluated",
                tandaId: tanda.id,
                tandaName: tanda.name,
                daysUntilCutoff: daysBetweenDates,
            },
            "Tanda reminder schedule evaluated",
        );

        const shouldSend =
            (tandaType === SUSCRIPTION_TYPES.MONTHLY &&
                MONTHLY_REMINDER_DAYS.has(daysBetweenDates)) ||
            (tandaType === SUSCRIPTION_TYPES.ANNUAL &&
                ANNUAL_REMINDER_DAYS.has(daysBetweenDates));

        if (!shouldSend) {
            logger.debug(
                { event: "reminders.tanda.skipped", tandaId: tanda.id },
                "No reminder is scheduled for this tanda today",
            );
            continue;
        }

        const debtors = await getDebtorsFromTanda(tanda, currentDatetime);
        if (debtors.length > 0) {
            await sendReminderToDebtors(debtors, tanda, daysBetweenDates);
            await sendMessagesToAdmins([
                {
                    body: `Le envié un recordatorio a los que faltan por pagarte su parte de *${tanda.name}* (${debtors.length} deudor(es)).`,
                },
            ]);
            logger.info(
                {
                    event: "reminders.tanda.sent",
                    tandaId: tanda.id,
                    tandaName: tanda.name,
                    debtors: debtors.length,
                },
                "Tanda reminders sent",
            );
        } else {
            logger.info(
                {
                    event: "reminders.tanda.no-debtors",
                    tandaId: tanda.id,
                    tandaName: tanda.name,
                },
                "No reminder sent because the tanda has no debtors",
            );
        }
    }

    logger.info(
        { event: "reminders.run.completed", activeTandas: activeTandas.length },
        "Daily tanda reminder evaluation completed",
    );
};

/**
 * Registers a payment for a tanda, accumulating any partial credit balance ("Saldo a favor")
 * and advancing "Siguiente pago" with the fixed day from Tanda.paymentDay when paidPeriods > 0.
 */
export const handleTandaPayment = async (
    payment: Payment,
): Promise<{
    paidPeriods: number;
    nextPayment: Date;
    newCreditBalance: number;
    tandaInfo: Tanda;
}> => {
    logger.info(
        {
            event: "payment.registration.started",
            userId: payment.user.id,
            tandaName: payment.tanda,
            amount: payment.amount,
        },
        "Registering tanda payment",
    );
    const tandaInfo = await getTandaByName(payment.tanda);
    if (!tandaInfo) {
        throw new Error(`Tanda "${payment.tanda}" not found`);
    }

    const tandaType =
        (tandaInfo.suscriptionType as SUSCRIPTION_TYPES) ||
        SUSCRIPTION_TYPES.MONTHLY;

    const [userLastPayments, legal] = await Promise.all([
        getLastUserTandaPayments(payment.user.id, tandaInfo.id, 1),
        getUserTandaLegal(payment.user.id, tandaInfo.id),
    ]);

    const currentCredit = roundCurrency(legal?.creditBalance ?? 0);
    const totalAvailable = roundCurrency(payment.amount + currentCredit);
    const paidPeriods = Math.floor(totalAvailable / tandaInfo.costPerUser);
    const newCreditBalance = roundCurrency(
        totalAvailable - paidPeriods * tandaInfo.costPerUser,
    );

    const baseDate =
        userLastPayments.length > 0
            ? userLastPayments[0].nextPayment
            : legal?.startDate ??
              getCurrentCycleCutoffDate(
                  tandaInfo.paymentDay,
                  payment.paymentDate,
                  tandaType,
              );

    const nextPayment =
        paidPeriods > 0
            ? getNextPaymentDateFromPayment(
                  baseDate,
                  paidPeriods,
                  tandaType,
                  tandaInfo.paymentDay,
              )
            : getNextPaymentDateFromPayment(
                  baseDate,
                  0,
                  tandaType,
                  tandaInfo.paymentDay,
              );

    const voucherFileUploadId = await uploadFileToNotion(payment.voucherPath);
    const title = `Pago de ${payment.user.name} - ${pesosFormatter.format(
        payment.amount,
    )}`;

    const notionPayment: TandaPayment = {
        title,
        userId: payment.user.id,
        tandaId: tandaInfo.id,
        paymentDate: payment.paymentDate,
        payment: payment.amount,
        nextPayment,
        voucherFileUploadId,
    };

    await addPaymentToTanda(notionPayment);
    await upsertUserTandaLegal({
        userId: payment.user.id,
        userName: payment.user.name,
        tandaId: tandaInfo.id,
        tandaName: tandaInfo.name,
        creditBalance: newCreditBalance,
    });

    logger.info(
        {
            event: "payment.registration.completed",
            userId: payment.user.id,
            tandaId: tandaInfo.id,
            tandaName: tandaInfo.name,
            amount: payment.amount,
            paidPeriods,
            creditBalance: newCreditBalance,
            nextPayment: formatMexicoCityDate(nextPayment),
        },
        "Tanda payment registered",
    );

    return { paidPeriods, nextPayment, newCreditBalance, tandaInfo };
};

/**
 * Registers an administrator-granted payment credit for an exact number of
 * tanda periods. No voucher is attached because this is an administrative
 * adjustment rather than a user transfer.
 */
export const grantTandaPeriods = async (params: {
    admin: User;
    user: User;
    tandaId: string;
    periods: number;
}): Promise<{
    tanda: Tanda;
    amount: number;
    nextPayment: Date;
    title: string;
}> => {
    if (!Number.isInteger(params.periods) || params.periods <= 0) {
        throw new Error("Granted periods must be a positive integer");
    }

    const tanda = await getTandaById(params.tandaId);
    if (!tanda || !tanda.isActive) {
        throw new Error("The selected tanda is not active");
    }

    if (!params.user.tandaIds.includes(tanda.id)) {
        throw new Error("The selected user is not a member of this tanda");
    }

    const tandaType =
        (tanda.suscriptionType as SUSCRIPTION_TYPES) ||
        SUSCRIPTION_TYPES.MONTHLY;
    const [lastPayments, legal] = await Promise.all([
        getLastUserTandaPayments(params.user.id, tanda.id, 1),
        getUserTandaLegal(params.user.id, tanda.id),
    ]);
    const now = new Date();
    const baseDate =
        lastPayments[0]?.nextPayment ??
        legal?.startDate ??
        getCurrentCycleCutoffDate(tanda.paymentDay, now, tandaType);
    const nextPayment = getNextPaymentDateFromPayment(
        baseDate,
        params.periods,
        tandaType,
        tanda.paymentDay,
    );
    const amount = roundCurrency(tanda.costPerUser * params.periods);
    const periodLabel =
        tandaType === SUSCRIPTION_TYPES.ANNUAL
            ? params.periods === 1
                ? "año"
                : "años"
            : params.periods === 1
              ? "mes"
              : "meses";
    const title = `Abono de ${params.periods} ${periodLabel} otorgado por admin ${params.admin.name}`;

    logger.info(
        {
            event: "admin.period-gift.started",
            adminId: params.admin.id,
            userId: params.user.id,
            tandaId: tanda.id,
            periods: params.periods,
            amount,
        },
        "Registering administrator-granted tanda periods",
    );

    await addPaymentToTanda({
        title,
        userId: params.user.id,
        tandaId: tanda.id,
        paymentDate: now,
        payment: amount,
        nextPayment,
    });

    await upsertUserTandaLegal({
        userId: params.user.id,
        userName: params.user.name,
        tandaId: tanda.id,
        tandaName: tanda.name,
        acceptedRules: legal?.acceptedRules ?? false,
        creditBalance: legal?.creditBalance ?? 0,
    });

    logger.info(
        {
            event: "admin.period-gift.completed",
            adminId: params.admin.id,
            userId: params.user.id,
            tandaId: tanda.id,
            periods: params.periods,
            amount,
            nextPayment: formatMexicoCityDate(nextPayment),
        },
        "Administrator-granted tanda periods registered",
    );

    return { tanda, amount, nextPayment, title };
};

/**
 * Gets the total money from valid future payments of a tanda.
 */
export const getTotalMoneyFromTandaPayments = (
    tanda: Tanda,
    payments: TandaPayment[],
): number => {
    const currentDatetime = new Date();
    const tandaType =
        (tanda.suscriptionType as SUSCRIPTION_TYPES) || SUSCRIPTION_TYPES.MONTHLY;

    return payments.reduce((acc, payment) => {
        const futurePeriods = countFuturePeriods(
            currentDatetime,
            payment.nextPayment,
            tanda.paymentDay,
            tandaType,
        );
        return acc + tanda.costPerUser * futurePeriods;
    }, 0);
};

/**
 * Builds a detailed debt summary (last 3 payments, credit balance, missing periods, total owed)
 * across all active tandas assigned to a user (for admin lookup).
 */
export const getUserDetailedDebtSummary = async (
    user: User,
): Promise<string[]> => {
    const activeTandas = await getActiveTandas();
    const userTandas = activeTandas.filter((t) => user.tandaIds.includes(t.id));

    if (userTandas.length === 0) {
        return [`ℹ️ *${user.name}* no está asignado a ninguna tanda activa.`];
    }

    const lines: string[] = [`📊 *Resumen de adeudos de ${user.name}:*`];
    const now = new Date();

    for (const tanda of userTandas) {
        const info = await getUserDebtInfo(tanda, user, now);
        const periodLabel =
            tanda.suscriptionType === SUSCRIPTION_TYPES.ANNUAL
                ? "año(s)"
                : "mes(es)";

        lines.push(`\n*${tanda.name}* (${pesosFormatter.format(tanda.costPerUser)} / ${tanda.suscriptionType === SUSCRIPTION_TYPES.ANNUAL ? "año" : "mes"})`);
        lines.push(`• Saldo a favor: *${pesosFormatter.format(info.creditBalance)}*`);

        if (info.missingPayments > 0) {
            lines.push(
                `• Adeudo: *${info.missingPayments} ${periodLabel}* — Total a pagar: *${pesosFormatter.format(info.totalAmountOwed)}*`,
            );
        } else if (info.nextPayment) {
            lines.push(
                `• Estado: *Al corriente* ✅ (próximo pago: ${formatMexicoCityDate(info.nextPayment)})`,
            );
        }

        if (info.lastPayments.length > 0) {
            lines.push("• Últimos pagos:");
            for (const p of info.lastPayments) {
                const periodsTxt =
                    p.paidPeriods !== undefined ? `${p.paidPeriods} ${periodLabel}` : "-";
                lines.push(
                    `  - ${formatMexicoCityDate(p.paymentDate)} | ${pesosFormatter.format(p.payment)} | ${periodsTxt}`,
                );
            }
        } else {
            lines.push("• Últimos pagos: Sin pagos registrados.");
        }
    }

    return [lines.join("\n")];
};

/**
 * Updates the price of a tanda in Notion and recalculates future advance payments
 * and credit balances for members who have paid ahead.
 */
export const adjustTandaPriceAndAdvancePayments = async (
    tandaId: string,
    newTotalCost: number,
): Promise<{
    tandaName: string;
    oldCostPerUser: number;
    newCostPerUser: number;
    adjustedUsers: Array<{
        userName: string;
        oldNextPayment: Date;
        newNextPayment: Date;
        newCreditBalance: number;
    }>;
}> => {
    const tanda = await getTandaById(tandaId);
    if (!tanda) {
        throw new Error("Tanda not found");
    }

    const oldCostPerUser = tanda.costPerUser;
    const newCostPerUser = roundCurrency(
        newTotalCost / Math.max(1, tanda.nMembers),
    );
    const tandaType =
        (tanda.suscriptionType as SUSCRIPTION_TYPES) || SUSCRIPTION_TYPES.MONTHLY;

    await updateTandaPrice(tanda.id, newTotalCost);

    const members = await getUsersByTandaId(tanda.id);
    const now = new Date();
    const currentCutoff = getCurrentCycleCutoffDate(
        tanda.paymentDay,
        now,
        tandaType,
    );

    const adjustedUsers: Array<{
        userName: string;
        oldNextPayment: Date;
        newNextPayment: Date;
        newCreditBalance: number;
    }> = [];

    for (const member of members) {
        const lastPayments = await getLastUserTandaPayments(member.id, tanda.id, 1);
        if (lastPayments.length === 0) continue;

        const lastPayment = lastPayments[0];
        if (compareCalendarDates(lastPayment.nextPayment, now) <= 0) {
            continue;
        }

        const futurePeriods = countFuturePeriods(
            now,
            lastPayment.nextPayment,
            tanda.paymentDay,
            tandaType,
        );
        if (futurePeriods <= 0) continue;

        const legal = await getUserTandaLegal(member.id, tanda.id);
        const existingCredit = roundCurrency(legal?.creditBalance ?? 0);
        const remainingValue = roundCurrency(
            futurePeriods * oldCostPerUser + existingCredit,
        );

        const newFuturePeriods = Math.floor(remainingValue / newCostPerUser);
        const newCreditBalance = roundCurrency(
            remainingValue - newFuturePeriods * newCostPerUser,
        );

        const anchorDate =
            compareCalendarDates(currentCutoff, now) > 0
                ? currentCutoff
                : getNextPaymentDateFromPayment(
                      currentCutoff,
                      1,
                      tandaType,
                      tanda.paymentDay,
                  );

        const newNextPayment = getNextPaymentDateFromPayment(
            anchorDate,
            newFuturePeriods,
            tandaType,
            tanda.paymentDay,
        );

        if (lastPayment.id) {
            await updatePaymentNextPaymentDate(lastPayment.id, newNextPayment);
        }
        await upsertUserTandaLegal({
            userId: member.id,
            userName: member.name,
            tandaId: tanda.id,
            tandaName: tanda.name,
            creditBalance: newCreditBalance,
        });

        adjustedUsers.push({
            userName: member.name,
            oldNextPayment: lastPayment.nextPayment,
            newNextPayment,
            newCreditBalance,
        });
    }

    return {
        tandaName: tanda.name,
        oldCostPerUser,
        newCostPerUser,
        adjustedUsers,
    };
};

/**
 * Updates a tanda's password in Notion and sends it only to members with 0 debt.
 */
export const updateTandaPasswordAndNotify = async (
    tandaId: string,
    newPassword: string,
): Promise<{
    tandaName: string;
    sentTo: string[];
    skippedDebtors: string[];
}> => {
    const tanda = await getTandaById(tandaId);
    if (!tanda) {
        throw new Error("Tanda not found");
    }

    await updateTandaPassword(tanda.id, newPassword);

    const members = await getUsersByTandaId(tanda.id);
    const now = new Date();
    const sentTo: string[] = [];
    const skippedDebtors: string[] = [];

    for (const member of members) {
        const debt = await getUserDebtInfo(tanda, member, now);
        if (debt.missingPayments === 0) {
            await sendMessagesToUser(member, [
                {
                    body: `🔐 ¡Hola ${member.name}! Se actualizó la contraseña de *${tanda.name}*.\n\n🔑 *Nueva contraseña:* \`${newPassword}\``,
                },
            ]);
            sentTo.push(member.name);
        } else {
            skippedDebtors.push(`${member.name} (${debt.missingPayments} pendiente(s))`);
        }
    }

    return {
        tandaName: tanda.name,
        sentTo,
        skippedDebtors,
    };
};

export { getTandaValidPayments };
