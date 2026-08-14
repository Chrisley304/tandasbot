import dotenv from "dotenv";
import { createProvider } from "@builderbot/bot";
import { BaileysProvider } from "@builderbot/provider-baileys";

dotenv.config();

const providerVersion = Number(process.env!.PROVIDER_VERSION);

export const provider = createProvider(BaileysProvider, {
    version: [2, 3000, providerVersion],
});
