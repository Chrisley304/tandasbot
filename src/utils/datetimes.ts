import { SUSCRIPTION_TYPES } from "@enums/suscriptions";

export const MEXICO_CITY_TIMEZONE = "America/Mexico_City";

export interface CalendarParts {
    year: number;
    month: number; // 1-12
    day: number; // 1-31
}

const mexicoFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: MEXICO_CITY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

/**
 * Extracts { year, month, day } in America/Mexico_City timezone.
 */
export const getMexicoCityDateParts = (date: Date): CalendarParts => {
    const parts = mexicoFormatter.formatToParts(date);
    const year = Number(parts.find((p) => p.type === "year")!.value);
    const month = Number(parts.find((p) => p.type === "month")!.value);
    const day = Number(parts.find((p) => p.type === "day")!.value);
    return { year, month, day };
};

/**
 * Parses a Notion date string (YYYY-MM-DD or ISO datetime) into a Date anchored at 12:00 UTC
 * so calendar day never shifts in America/Mexico_City.
 */
export const parseNotionDate = (dateString: string): Date => {
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString.trim());
    if (dateOnlyMatch) {
        const [, y, m, d] = dateOnlyMatch;
        return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12, 0, 0));
    }
    const parsed = new Date(dateString);
    const { year, month, day } = getMexicoCityDateParts(parsed);
    return makeMexicoCityDate(year, month, day);
};

/**
 * Returns the number of days in a given 1-based month.
 */
const daysInMonth = (year: number, month: number): number =>
    new Date(Date.UTC(year, month, 0)).getUTCDate();

/**
 * Creates a Date anchored at noon UTC for a Mexico City calendar date, clamping day to month length.
 */
export const makeMexicoCityDate = (
    year: number,
    month: number,
    day: number,
): Date => {
    const clampedDay = Math.min(Math.max(1, day), daysInMonth(year, month));
    return new Date(Date.UTC(year, month - 1, clampedDay, 12, 0, 0));
};

/**
 * Convert a Date object to "YYYY-MM-DD" in America/Mexico_City.
 */
export const getMexicoCityISODate = (date: Date): string => {
    const { year, month, day } = getMexicoCityDateParts(date);
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

/**
 * Format a Date object as "DD/MM/YYYY" in America/Mexico_City.
 */
export const formatMexicoCityDate = (date: Date): string => {
    const { year, month, day } = getMexicoCityDateParts(date);
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
};

/**
 * Converts a Date to UTC epoch days in America/Mexico_City calendar.
 */
const toEpochDays = (date: Date): number => {
    const { year, month, day } = getMexicoCityDateParts(date);
    return Math.floor(Date.UTC(year, month - 1, day) / (1000 * 60 * 60 * 24));
};

/**
 * Compares two Dates by calendar date in America/Mexico_City (-1, 0, 1).
 */
export const compareCalendarDates = (a: Date, b: Date): number => {
    const diff = toEpochDays(a) - toEpochDays(b);
    if (diff < 0) return -1;
    if (diff > 0) return 1;
    return 0;
};

/**
 * Advances a payment date by `paidPeriods` keeping the fixed day (and month if annual)
 * from `tandaPaymentDay`.
 */
export const getNextPaymentDateFromPayment = (
    currentPaymentDate: Date,
    paidPeriods: number,
    paymentType: SUSCRIPTION_TYPES = SUSCRIPTION_TYPES.MONTHLY,
    tandaPaymentDay?: Date,
): Date => {
    const baseParts = getMexicoCityDateParts(currentPaymentDate);
    const fixedParts = tandaPaymentDay
        ? getMexicoCityDateParts(tandaPaymentDay)
        : baseParts;

    if (paymentType === SUSCRIPTION_TYPES.ANNUAL) {
        return makeMexicoCityDate(
            baseParts.year + paidPeriods,
            fixedParts.month,
            fixedParts.day,
        );
    }

    const totalMonths = baseParts.year * 12 + (baseParts.month - 1) + paidPeriods;
    const targetYear = Math.floor(totalMonths / 12);
    const targetMonth = (totalMonths % 12) + 1;
    return makeMexicoCityDate(targetYear, targetMonth, fixedParts.day);
};

/**
 * Returns the cutoff date for the current cycle of a tanda in America/Mexico_City.
 */
export const getCurrentCycleCutoffDate = (
    tandaPaymentDay: Date,
    currentDate: Date,
    tandaType: SUSCRIPTION_TYPES = SUSCRIPTION_TYPES.MONTHLY,
): Date => {
    const now = getMexicoCityDateParts(currentDate);
    const fixed = getMexicoCityDateParts(tandaPaymentDay);

    if (tandaType === SUSCRIPTION_TYPES.ANNUAL) {
        return makeMexicoCityDate(now.year, fixed.month, fixed.day);
    }
    return makeMexicoCityDate(now.year, now.month, fixed.day);
};

/**
 * Counts how many periods are due from `dueDate` up to `currentDate` (inclusive).
 * Returns 0 if `currentDate` is strictly before `dueDate`.
 */
export const countDuePeriods = (
    dueDate: Date,
    currentDate: Date,
    tandaPaymentDay: Date,
    tandaType: SUSCRIPTION_TYPES = SUSCRIPTION_TYPES.MONTHLY,
): number => {
    if (compareCalendarDates(currentDate, dueDate) < 0) {
        return 0;
    }

    let dueCount = 0;
    let cursor = getNextPaymentDateFromPayment(
        dueDate,
        0,
        tandaType,
        tandaPaymentDay,
    );

    // If dueDate itself is already <= currentDate, that counts as 1, plus each subsequent cycle <= currentDate
    while (compareCalendarDates(cursor, currentDate) <= 0) {
        dueCount += 1;
        cursor = getNextPaymentDateFromPayment(
            cursor,
            1,
            tandaType,
            tandaPaymentDay,
        );
        if (dueCount > 240) break; // safety guard
    }

    return dueCount;
};

/**
 * Counts how many future full periods remain in `nextPaymentDate` beyond `currentDate`.
 */
export const countFuturePeriods = (
    currentDate: Date,
    nextPaymentDate: Date,
    tandaPaymentDay: Date,
    tandaType: SUSCRIPTION_TYPES = SUSCRIPTION_TYPES.MONTHLY,
): number => {
    if (compareCalendarDates(nextPaymentDate, currentDate) <= 0) {
        return 0;
    }

    let count = 0;
    let cursor = getCurrentCycleCutoffDate(tandaPaymentDay, currentDate, tandaType);
    if (compareCalendarDates(cursor, currentDate) <= 0) {
        cursor = getNextPaymentDateFromPayment(cursor, 1, tandaType, tandaPaymentDay);
    }

    while (compareCalendarDates(cursor, nextPaymentDate) < 0) {
        count += 1;
        cursor = getNextPaymentDateFromPayment(cursor, 1, tandaType, tandaPaymentDay);
        if (count > 240) break;
    }

    return count;
};

/**
 * Signed difference in days between the tanda's current cycle cutoff and `currentDate`:
 * > 0: days remaining before cutoff
 * = 0: cutoff day
 * < 0: days overdue
 */
export function getTandaDaysDiff(
    tandaPaymentDate: Date,
    currentDate: Date,
    tandaType: SUSCRIPTION_TYPES = SUSCRIPTION_TYPES.MONTHLY,
): number {
    const cutoff = getCurrentCycleCutoffDate(tandaPaymentDate, currentDate, tandaType);
    return toEpochDays(cutoff) - toEpochDays(currentDate);
}

/**
 * Formats user tenure in a tanda (years and months) in Spanish.
 */
export const getTenureText = (startDate: Date, currentDate: Date): string => {
    const start = getMexicoCityDateParts(startDate);
    const now = getMexicoCityDateParts(currentDate);

    let totalMonths = (now.year - start.year) * 12 + (now.month - start.month);
    if (now.day < start.day) {
        totalMonths -= 1;
    }

    if (totalMonths <= 0) {
        return "menos de 1 mes";
    }

    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    const parts: string[] = [];
    if (years > 0) {
        parts.push(`${years} ${years === 1 ? "año" : "años"}`);
    }
    if (months > 0) {
        parts.push(`${months} ${months === 1 ? "mes" : "meses"}`);
    }

    return parts.join(" y ");
};
