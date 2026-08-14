import type { BotContext } from "@builderbot/bot/dist/types";
import type { BaileysProvider } from "@builderbot/provider-baileys";

import fs from "fs";
import { readFile } from "fs/promises";
import { basename } from "path";
import { notionClient } from "./notion/client";
import { VOUCHERS_PATH } from "@constants/paths";
import logger from "./logger";

/**
 * Save the payment photo sent by the user to a local directory in the project.
 */
export const savePaymentPhoto = async (
    ctx: BotContext,
    provider: BaileysProvider,
    userId: string
) => {
    if (!fs.existsSync(`${process.cwd()}/${VOUCHERS_PATH}`)) {
        fs.mkdirSync(`${process.cwd()}/${VOUCHERS_PATH}`);
    }

    if (!fs.existsSync(`${process.cwd()}/${VOUCHERS_PATH}/${userId}`)) {
        fs.mkdirSync(`${process.cwd()}/${VOUCHERS_PATH}/${userId}`);
    }

    const localPath = await provider.saveFile(ctx, {
        path: `${process.cwd()}/${VOUCHERS_PATH}/${userId}`,
    });

    return localPath;
};

/**
 * Uploads a file to a Notion page and returns the file ID.
 * @param filePath - The local path of the file to be uploaded.
 * @returns The ID of the uploaded file.
 */
export const uploadFileToNotion = async (filePath: string): Promise<string> => {
    try {
        // Create Notion File Upload
        const fileUpload = await notionClient.fileUploads.create({
            mode: "single_part",
        });

        const buffer = await readFile(filePath); // Buffer from fs
        const uint8 = new Uint8Array(buffer); // Convert to ArrayBufferView
        const fileStream = new Blob([uint8], { type: "image/png" });

        const uploadResponse = await notionClient.fileUploads.send({
            file_upload_id: fileUpload.id,
            file: {
                filename: basename(filePath),
                data: fileStream,
            },
        });

        if (uploadResponse.status === "uploaded") {
            logger.info("File uploaded to Notion successfully");
            return fileUpload.id;
        } else {
            logger.error("Error uploading file to Notion");
            throw new Error("Error uploading file to Notion");
        }
    } catch (error) {
        logger.error(`Error while uploading file to Notion: ${error}`);
        throw error;
    }
};
