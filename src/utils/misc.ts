/**
 * Capitalize the first letter of each word in a sentence.
 */
export const toTitleCase = (str: string) =>
    str.replace(
        /(^\w|\s\w)(\S*)/g,
        (_, m1, m2) => m1.toUpperCase() + m2.toLowerCase(),
    );

export const pesosFormatter = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
});

/**
 * Round a currency amount to 2 decimal places.
 */
export const roundCurrency = (amount: number): number =>
    Math.round((amount + Number.EPSILON) * 100) / 100;

/**
 * Normalize a tanda name or command fragment for comparison:
 * strips emojis/symbols, accents, trims, lowercases, and collapses whitespace.
 */
export const normalizeTandaName = (text: string): string =>
    text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

