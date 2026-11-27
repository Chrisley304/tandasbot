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

        logger.info(
            `Checking tanda ${tanda.name} (daysDiff: ${daysBetweenDates})`,
        );

        const shouldSend =
            (tandaType === SUSCRIPTION_TYPES.MONTHLY &&
                MONTHLY_REMINDER_DAYS.has(daysBetweenDates)) ||
            (tandaType === SUSCRIPTION_TYPES.ANNUAL &&
                ANNUAL_REMINDER_DAYS.has(daysBetweenDates));

        if (!shouldSend) {
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
        }
    }
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

    return { paidPeriods, nextPayment, newCreditBalance, tandaInfo };
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
