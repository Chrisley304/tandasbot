import dotenv from "dotenv";
import { type GenerateContentConfig, GoogleGenAI } from "@google/genai";
import type { Tanda } from "@custom-types/notion/tandasDB";
import { SUSCRIPTION_TYPES } from "@enums/suscriptions";
import { getMexicoCityDateParts } from "@utils/datetimes";
import { pesosFormatter } from "@utils/misc";
import botInstructionsTemplate from "./aiContext.md";

dotenv.config();

export const aiModel = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const formatTandasContext = (activeTandas: Tanda[]): string => {
    if (activeTandas.length === 0) {
        return "_No hay tandas activas registradas actualmente._";
    }

    return activeTandas
        .map((tanda) => {
            const lowerName = tanda.name.toLowerCase();
            const cost = pesosFormatter.format(tanda.costPerUser);
            const { day, month } = getMexicoCityDateParts(tanda.paymentDay);
            const recurrenceLabel =
                tanda.suscriptionType === SUSCRIPTION_TYPES.ANNUAL
                    ? `anual (día ${day}/${month})`
                    : `mensual (día ${day} de cada mes)`;
            const rulesText = tanda.rules?.trim()
                ? tanda.rules.trim()
                : "Sin reglamento personalizado.";

            return [
                `### Tanda: ${tanda.name}`,
                `- Recurrencia: ${recurrenceLabel}`,
                `- Costo por miembro: ${cost}`,
                `- Comandos: \`pagar ${lowerName}\`, \`mi ${lowerName}\`, \`reglamento ${lowerName}\``,
                `- Reglamento: ${rulesText}`,
            ].join("\n");
        })
        .join("\n\n");
};

export const buildAiModelConfig = (
    activeTandas: Tanda[],
): GenerateContentConfig => ({
    systemInstruction: botInstructionsTemplate.replace(
        "{{TANDAS_CONTEXT}}",
        formatTandasContext(activeTandas),
    ),
    responseMimeType: "application/json",
    responseSchema: {
        type: "object",
        properties: {
            messageToUser: {
                type: "string",
                description:
                    "El mensaje que se le enviará al usuario. Este mensaje debe seguir la guía de estilo proporcionada en las instrucciones del sistema y debe ser claro, conciso y relevante para la consulta del usuario.",
            },
            startCommand: {
                type: "string",
                description:
                    "En este campo escribe exactamente el comando que vas a iniciar para continuar con la operación que el usuario necesita, en el caso que no sea necesario iniciar ninguna petición, envía este campo vacío.",
            },
        },
        propertyOrdering: ["messageToUser", "startCommand"],
        required: ["startCommand"],
    },
});
