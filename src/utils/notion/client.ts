import { Client } from "@notionhq/client";
import dotenv from "dotenv";

dotenv.config();

const createNotionClient = () => {
    const { NOTION_API_TOKEN } = process.env;

    if (!NOTION_API_TOKEN) {
        throw new Error("Missing NOTION_TOKEN");
    }

    return new Client({
        auth: NOTION_API_TOKEN,
    });
};

export const notionClient = createNotionClient();
