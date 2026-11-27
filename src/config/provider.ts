import { createProvider } from "@builderbot/bot";
import { BaileysProvider } from "@builderbot/provider-baileys";
import { fetchLatestWaWebVersion } from "@whiskeysockets/baileys";
import logger from "@utils/logger";

export let provider: BaileysProvider;

/**
 * Initializes BaileysProvider resolving the latest WhatsApp Web version automatically
 * and enabling store memory/disk optimization.
 */
export const initProvider = async () => {
    let version: [number, number, number] | undefined;

    try {
        const result = await fetchLatestWaWebVersion({});
        if (result?.version) {
            version = result.version;
            logger.info(
                {
                    event: "provider.version.resolved",
                    version: version.join("."),
                    isLatest: result.isLatest,
                },
                "Resolved WhatsApp Web version",
            );
        }
    } catch (error) {
        logger.warn(
            { err: error, event: "provider.version.fallback" },
            "Could not resolve the WhatsApp Web version; using provider default",
        );
    }

    const options: ConstructorParameters<typeof BaileysProvider>[0] = {
        ...(version ? { version } : {}),
        experimentalStore: true,
        timeRelease: 10800000, // 3 hours in milliseconds
    };

    provider = createProvider<
        BaileysProvider,
        ConstructorParameters<typeof BaileysProvider>[0]
    >(BaileysProvider, options);

    logger.info(
        {
            event: "provider.initialized",
            experimentalStore: true,
            sessionReleaseMs: 10_800_000,
        },
        "WhatsApp provider initialized",
    );

    return provider;
};
