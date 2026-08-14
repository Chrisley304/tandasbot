import dotenv from "dotenv";
import { type GenerateContentConfig, GoogleGenAI } from "@google/genai";
import botInstructionsMd from "./aiContext.md";

dotenv.config();

export const aiModel = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

export const aiModelConfig: GenerateContentConfig = {
    systemInstruction: botInstructionsMd,
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
};
