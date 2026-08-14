/**
 * Capitalize the first letter of a sentence.
 */
export function capitalizeFirstLetter(sentence: string) {
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/**
 * Capitalize the first letter of each word in a sentence.
 */
export const toTitleCase = (str: string) =>
    str.replace(
        /(^\w|\s\w)(\S*)/g,
        (_, m1, m2) => m1.toUpperCase() + m2.toLowerCase()
    );

export const pesosFormatter = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
});

/**
 * Convert a string to camelCase
 * @param text - The text to convert
 */
export const textToCamelCase = (text: string) =>
    text
        .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
            return index == 0 ? word.toLowerCase() : word.toUpperCase();
        })
        .replace(/\s+/g, "");

/**
 * Convert a string to PascalCase
 * @param text - The text to convert
 */
export const textToPascalCase = (text: string) =>
    text
        .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
            return word.toUpperCase();
        })
        .replace(/\s+/g, "");

/**
 * Convert a string to snake_case
 * @param text - The text to convert
 */
export const textToSnakeCase = (text: string) =>
    text
        .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
            return index == 0 ? word.toLowerCase() : "_" + word.toLowerCase();
        })
        .replace(/\s+/g, "");
