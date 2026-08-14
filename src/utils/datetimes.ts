import { SUSCRIPTION_TYPES } from "@enums/suscriptions";

/**
 * Convert a Date object to a string in the format "YYYY-MM-DD" using Mexico City's timezone.
 */
export const getMexicoCityISODate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based
    const dd = String(date.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
};

/**
 * Gets the next payment date from a payment that can be monthly or annual.
 */
export const getNextPaymentDateFromPayment = (
    currentPaymentDate: Date,
    paidPeriods: number,
    paymentType: SUSCRIPTION_TYPES = SUSCRIPTION_TYPES.MONTHLY
) => {
    if (paymentType === SUSCRIPTION_TYPES.ANNUAL) {
        const newDate = new Date(currentPaymentDate);
        newDate.setFullYear(newDate.getFullYear() + paidPeriods);

        return newDate;
    }

    const newDate = new Date(currentPaymentDate);
    newDate.setMonth(newDate.getMonth() + paidPeriods);

    return newDate;
};

/**
 * Gets the difference in months between two dates, without considering the days.
 */
export function monthDiff(dateFrom: Date, dateTo: Date) {
    return (
        dateTo.getMonth() -
        dateFrom.getMonth() +
        12 * (dateTo.getFullYear() - dateFrom.getFullYear())
    );
}

/**
 * Gets the difference in years between two dates, without considering the days.
 */
export function yearsDiff(dateFrom: Date, dateTo: Date) {
    return dateTo.getFullYear() - dateFrom.getFullYear();
}

/**
 * Gets the difference in days between two dates.
 */
export function daysDiff(dateFrom: Date, dateTo: Date) {
    const diffTime = Math.abs(dateTo.getTime() - dateFrom.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Gets the difference in days between two dates, if the tanda is monthly it only uses the day from the tanda payment with the current month and year. If the tanda is annual it uses the day and month from the tanda payment with the current year.
 */
export function getTandaDaysDiff(
    tandaPaymentDate: Date,
    currentDate: Date,
    tandaType: SUSCRIPTION_TYPES = SUSCRIPTION_TYPES.MONTHLY
) {
    const currentTandaPaymentDate = new Date(tandaPaymentDate);

    if (tandaType === SUSCRIPTION_TYPES.ANNUAL) {
        currentTandaPaymentDate.setFullYear(currentDate.getFullYear());
    } else {
        currentTandaPaymentDate.setMonth(currentDate.getMonth());
        currentTandaPaymentDate.setFullYear(currentDate.getFullYear());
    }

    return daysDiff(currentTandaPaymentDate, currentDate);
}

/**
 * Gets the start and end date of a month from a given date.
 */
export const getMonthStartAndEnd = (date: Date) => {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    return { startOfMonth, endOfMonth };
};
