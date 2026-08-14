/**
 * Cleans the phone number got from builder bot `ctx.key.remoteJid` response.
 * @param fromResponse - The `ctx.key.remoteJid` response string.
 * @returns The cleaned phone number.
 */
export const getCleanPhoneNumber = (fromResponse: string): string =>
    fromResponse.split("@")[0];
