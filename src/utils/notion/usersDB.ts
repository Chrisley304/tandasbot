import type { QueryDataSourceResponse } from "@notionhq/client/build/src/api-endpoints";
import type { User, UsersDatabaseItem } from "@custom-types/notion/usersDB";

import dotenv from "dotenv";
import { notionClient } from "./client";
import logger from "../logger";

dotenv.config();

const getUsersDataSourceId = (): string => {
    const { NOTION_USERS_DATASOURCE_ID } = process.env;
    if (!NOTION_USERS_DATASOURCE_ID) {
        throw new Error("Missing NOTION_USERS_DATASOURCE_ID");
    }
    return NOTION_USERS_DATASOURCE_ID;
};

/**
 * Extracts user data from a Notion API response.
 */
const extractUsersData = (response: QueryDataSourceResponse): User[] => {
    const databaseItems = response.results as UsersDatabaseItem[];

    return databaseItems.map((dbItem) => ({
        id: dbItem.id,
        name: dbItem.properties.Nombre?.title?.[0]?.plain_text || "",
        phone: (dbItem.properties.Telefono?.phone_number || "").replace(
            /[^\d]/g,
            "",
        ),
        isAdmin: dbItem.properties["Admin?"]?.checkbox || false,
        tandaIds:
            dbItem.properties.Tandas?.relation?.map((rel) => rel.id) || [],
    }));
};

/**
 * Retrieves all users marked with "Admin?" = true in Notion.
 */
export const getAdminUsers = async (): Promise<User[]> => {
    const response = await notionClient.dataSources.query({
        data_source_id: getUsersDataSourceId(),
        filter: {
            property: "Admin?",
            checkbox: {
                equals: true,
            },
        },
    });

    return extractUsersData(response);
};

/**
 * Retrieves a user from the Notion users database by phone number (handles MX 521 / 52).
 */
export const getUserFromPhone = async (
    userPhone: string,
): Promise<User | null> => {
    const cleanPhone = userPhone.replace(/[^\d]/g, "");
    if (!cleanPhone) return null;

    logger.debug(
        {
            event: "notion.user.lookup.phone",
            phoneLast4: cleanPhone.slice(-4),
        },
        "Looking up user by phone",
    );

    const dataSourceId = getUsersDataSourceId();
    const candidates = [cleanPhone];
    if (cleanPhone.startsWith("521") && cleanPhone.length === 13) {
        candidates.push(`52${cleanPhone.slice(3)}`);
    } else if (cleanPhone.startsWith("52") && cleanPhone.length === 12) {
        candidates.push(`521${cleanPhone.slice(2)}`);
    }

    for (const phoneCandidate of candidates) {
        const response = await notionClient.dataSources.query({
            data_source_id: dataSourceId,
            filter: {
                property: "Telefono",
                phone_number: {
                    contains: phoneCandidate,
                },
            },
        });

        if (response.results.length > 0) {
            return extractUsersData(response)[0];
        }
    }

    return null;
};

/**
 * Retrieves users belonging to a specific tanda by its Notion page ID.
 */
export const getUsersByTandaId = async (tandaId: string): Promise<User[]> => {
    const response = await notionClient.dataSources.query({
        data_source_id: getUsersDataSourceId(),
        filter: {
            property: "Tandas",
            relation: {
                contains: tandaId,
            },
        },
    });

    return extractUsersData(response);
};

/**
 * Retrieves a user from the Notion users database by name (case-insensitive fallback).
 */
export const getUserFromName = async (
    userName: string,
): Promise<User | null> => {
    const response = await notionClient.dataSources.query({
        data_source_id: getUsersDataSourceId(),
        filter: {
            property: "Nombre",
            title: {
                contains: userName.trim(),
            },
        },
    });

    if (response.results.length === 0) {
        return null;
    }

    const users = extractUsersData(response);
    const exactMatch = users.find(
        (u) => u.name.toLowerCase() === userName.trim().toLowerCase(),
    );
    return exactMatch || users[0];
};
