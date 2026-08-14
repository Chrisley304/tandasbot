import type { Deptor } from "@custom-types/debtors";
import type { Tanda } from "@custom-types/notion/tandasDB";
import type { TandaPayment } from "@custom-types/notion/paymentsDB";
import type { Payment } from "@custom-types/payments";
import type { User } from "@custom-types/notion/usersDB";
import type { Message } from "@custom-types/messages";

import { getUsersFromGroup } from "./notion/usersDB";
import {
    addPaymentToTanda,
    getAllTandas,
    getLastUserTandaPayments,
    getTandaByName,
} from "./notion/tandasDB";
import { sendMessagesToUser, sendReminderToDebtors } from "./users";
import { pesosFormatter, textToCamelCase } from "./misc";
import {
    yearsDiff,
    getNextPaymentDateFromPayment,
    getTandaDaysDiff,
    monthDiff,
} from "./datetimes";
import logger from "./logger";
import { SUSCRIPTION_TYPES } from "@enums/suscriptions";
import { ADMIN_USER } from "@constants/users";
import { uploadFileToNotion } from "./files";

/**
 * @todo Add optional property to User type to indicate the number of months the user has to pay, maybe instead of using `overdue_payment` property getting from Notion only the last payment made by the user.
 */
export const getDebtorsFromMonthlyTanda = async (
    tanda: Tanda,
    currentDatetime: Date,
): Promise<Deptor[]> => {
    try {
        const tandaUsers = await getUsersFromGroup(tanda.name);

        return await Promise.all(
            tandaUsers.map(async (user) => {
                const missingPayments = await getUserMissingPayments(
                    tanda,
                    user,
                    currentDatetime,
                    SUSCRIPTION_TYPES.MONTHLY,
                );

                if (missingPayments > 0) {
                    return { missingPayments, user };
                }

                return undefined;
            }),
        ).then((debtors) =>
            debtors.filter(function (element) {
                return element !== undefined;
            }),
        );
    } catch (error) {
        logger.error(error);
        return [];
    }
};

/**
 * This function returns the number of missing payments a user has to do for a tanda.
 * @param tanda - The tanda to check
 * @param user - The user to check
 * @param currentDatetime - The current datetime
 * @param tandaType - The tanda type (monthly or annual)
 * @returns The number of missing payments
 */
export const getUserMissingPayments = async (
    tanda: Tanda,
    user: User,
    currentDatetime: Date,
    tandaType: SUSCRIPTION_TYPES,
): Promise<number> => {
    try {
        const lastPayments: TandaPayment[] | null =
            await getLastUserTandaPayments(user.id, tanda.name);

        const currentTandaDate =
            tandaType === "annual"
                ? new Date(
                      Date.UTC(
                          currentDatetime.getFullYear(),
                          tanda.paymentDay.getMonth(),
                          tanda.paymentDay.getDate() + 1,
                      ),
                  )
                : new Date(
                      Date.UTC(
                          currentDatetime.getFullYear(),
                          currentDatetime.getMonth(),
                          tanda.paymentDay.getDate() + 1,
                      ),
                  );

        // If the user has not made any payment is a debtor
        if (lastPayments === null) {
            const tandaStartDateProperty = `${textToCamelCase(
                tanda.name,
            )}StartDate`;

            // As the user has not made any payment, we need to know when the user started the tanda
            if (Object.hasOwn(user, tandaStartDateProperty)) {
                const tandaStartDate: Date = user[tandaStartDateProperty];

                if (!tandaStartDate) {
                    return 1;
                } else if (tandaType === SUSCRIPTION_TYPES.ANNUAL) {
                    return yearsDiff(tandaStartDate, currentDatetime) + 1;
                } else {
                    return monthDiff(tandaStartDate, currentDatetime) + 1;
                }
            }

            return 1;
        }

        // As the payments are ordered by the next_payment date, the last payment is the first element
        const lastPayment = lastPayments[0];

        if (lastPayment.nextPayment <= currentTandaDate) {
            if (tandaType === SUSCRIPTION_TYPES.ANNUAL) {
                return yearsDiff(lastPayment.nextPayment, currentDatetime) + 1;
            } else {
                return monthDiff(lastPayment.nextPayment, currentDatetime) + 1;
            }
        }

        return 0;
    } catch (error) {
        logger.error(error);
        return 0;
    }
};

export const getDebtorsFromYearlyTanda = async (
    tanda: Tanda,
    currentDatetime: Date,
): Promise<Deptor[]> => {
    try {
        const tandaUsers = await getUsersFromGroup(tanda.name);

        return await Promise.all(
            tandaUsers.map(async (user) => {
                const missingPayments = await getUserMissingPayments(
                    tanda,
                    user,
                    currentDatetime,
                    SUSCRIPTION_TYPES.ANNUAL,
                );

                if (missingPayments > 0) {
                    return { missingPayments, user };
                }

                return undefined;
            }),
        ).then((debtors) =>
            debtors.filter(function (element) {
                return element !== undefined;
            }),
        );
    } catch (error) {
        logger.error(error);
        return [];
    }
};

/**
 * This function reminds the users about doing their due payments for the tandas
 * 7, 5, 2 and 1 day before the payment day, and also at the day of the payment.
 */
export const handleDailyTandasReminders = async () => {
    const currentDatetime = new Date();

    const tandas = await getAllTandas();

    await sendMessagesToUser(ADMIN_USER, [
        {
            body: `Hola ${ADMIN_USER.name}! 👋🏼. Voy a comprobar si amigos te deben y en cuyo caso enviarles un recordatorio 🤓👆🏼`,
        },
    ]);

    tandas.forEach(async (tanda) => {
        const daysBetweenDates: number = getTandaDaysDiff(
            tanda.paymentDay,
            currentDatetime,
            tanda.suscriptionType as SUSCRIPTION_TYPES,
        );

        logger.info(
            `Checking tanda ${tanda.name} with payment day ${tanda.paymentDay} and current date ${currentDatetime}`,
        );

        logger.info(`${daysBetweenDates} days between dates for ${tanda.name}`);

        if (
            tanda.suscriptionType === SUSCRIPTION_TYPES.MONTHLY &&
            daysBetweenDates <= 8
        ) {
            const debtors = await getDebtorsFromMonthlyTanda(
                tanda,
                currentDatetime,
            );

            if (debtors.length > 0) {
                await sendReminderToDebtors(debtors, tanda, daysBetweenDates);

                const messagesToAdmin: Message[] = [
                    {
                        body: `Le envie un recordatorio a los que faltan por pagarte su parte de *${tanda.name}*`,
                    },
                ];
                await sendMessagesToUser(ADMIN_USER, messagesToAdmin);
            }
        } else if (
            tanda.suscriptionType === SUSCRIPTION_TYPES.ANNUAL &&
            daysBetweenDates <= 30
        ) {
            const debtors = await getDebtorsFromYearlyTanda(
                tanda,
                currentDatetime,
            );

            if (debtors.length > 0) {
                await sendReminderToDebtors(debtors, tanda, daysBetweenDates);

                const messagesToAdmin: Message[] = [
                    {
                        body: `Le envie un recordatorio a los que faltan por pagarte su parte de *${tanda.name}*`,
                    },
                ];
                await sendMessagesToUser(ADMIN_USER, messagesToAdmin);
            }
        }
    });
};

export const handleTandaPayment = async (
    payment: Payment,
): Promise<{ paidPeriods: number; nextPayment: Date }> => {
    const title = `Pago de ${payment.user.name} - ${pesosFormatter.format(
        payment.amount,
    )}`;

    const { paymentDate } = payment;

    const tandaInfo = await getTandaByName(payment.tanda);

    if (!tandaInfo) {
        throw new Error("Tanda not found");
    }

    // The paid periods are floored to avoid confusing the user with decimals
    const paidPeriods = Math.floor(payment.amount / tandaInfo.costPerUser);
    const userLastPayments = await getLastUserTandaPayments(
        payment.user.id,
        payment.tanda,
    );

    const currentYearPaymentDate: Date = new Date(
        new Date(tandaInfo.paymentDay).setFullYear(new Date().getFullYear()),
    );

    let nextPayment: Date = getNextPaymentDateFromPayment(
        tandaInfo.suscriptionType === SUSCRIPTION_TYPES.ANNUAL
            ? currentYearPaymentDate
            : paymentDate,
        paidPeriods,
        tandaInfo.suscriptionType as SUSCRIPTION_TYPES,
    );

    if (userLastPayments && userLastPayments.length > 0) {
        const lastPaymentDate = userLastPayments[0].nextPayment;
        nextPayment = getNextPaymentDateFromPayment(
            lastPaymentDate,
            paidPeriods,
            tandaInfo.suscriptionType as SUSCRIPTION_TYPES,
        );
    } else {
        const tandaStartDateProperty = `${textToCamelCase(
            payment.tanda,
        )}StartDate`;

        // As the user has not made any payment, we need to know when the user started the tanda
        if (Object.hasOwn(payment.user, tandaStartDateProperty)) {
            const tandaStartDate: Date | undefined =
                payment.user[tandaStartDateProperty];

            if (tandaStartDate) {
                nextPayment = getNextPaymentDateFromPayment(
                    tandaStartDate,
                    paidPeriods,
                    tandaInfo.suscriptionType as SUSCRIPTION_TYPES,
                );
            }
        }
    }

    const voucherFileUploadId = await uploadFileToNotion(payment.voucherPath);

    const notionPayment: TandaPayment = {
        title,
        userId: payment.user.id,
        tanda: payment.tanda,
        paymentDate,
        payment: payment.amount,
        paidPeriods,
        nextPayment,
        voucherPath: payment.voucherPath,
        voucherFileUploadId,
    };

    // Add the payment to the tanda DB in Notion
    await addPaymentToTanda(notionPayment);

    return { paidPeriods, nextPayment };
};

/**
 * Gets the total money from the payments of a tanda, considering the current datetime and the next payment date of each payment.
 */
export const getTotalMoneyFromTandaPayments = (
    tanda: Tanda,
    payments: TandaPayment[],
): number => {
    const currentDatetime = new Date();

    if (tanda.suscriptionType === SUSCRIPTION_TYPES.ANNUAL) {
        return payments.reduce((acc, payment) => {
            // There is money on the account
            if (
                currentDatetime.getFullYear() >=
                payment.nextPayment.getFullYear()
            ) {
                return acc;
            }

            const paymentYearsDiff = yearsDiff(
                currentDatetime,
                payment.nextPayment,
            );

            const totalPayment = tanda.costPerUser * paymentYearsDiff;

            return acc + totalPayment;
        }, 0);
    }

    return payments.reduce((acc, payment) => {
        // There is money on the account
        if (currentDatetime >= payment.nextPayment) {
            return acc;
        }

        let paymentMonthsDiff = monthDiff(currentDatetime, payment.nextPayment);

        const currentMonthNextPaymentDate = new Date(
            new Date(payment.nextPayment).setMonth(currentDatetime.getMonth()),
        );

        if (currentDatetime >= currentMonthNextPaymentDate) {
            paymentMonthsDiff -= 1;
        }

        const totalPayment = tanda.costPerUser * paymentMonthsDiff;

        return acc + totalPayment;
    }, 0);
};
