import type {
    GetDataSourceResponse,
    QueryDataSourceResponse,
} from "@notionhq/client/build/src/api-endpoints";
import type { User, UsersDatabaseItem } from "@custom-types/notion/usersDB";

import dotenv from "dotenv";
import { notionClient } from "./client";

import logger from "../logger";
import { ADMIN_USER } from "../../constants/users";

dotenv.config();

/**
 * Extracts user data from a Notion API response.
 * @param response - The response from the Notion API.
 * @returns An array of user objects.
 */
const extractUsersData = (response: QueryDataSourceResponse): User[] => {
    const databaseItems = response.results as UsersDatabaseItem[];

    return databaseItems.map((dbItem) => {
        const title = dbItem.properties.name.title[0].plain_text;
        const phone = dbItem.properties.phone.phone_number || "";
        const groups = dbItem.properties.groups.multi_select.map(
            (group) => group.name,
        );
        const spotifyStartDate = dbItem.properties.spotify_start_date.date
            ? new Date(dbItem.properties.spotify_start_date.date.start)
            : null;
        const amazonPrimeStartDate = dbItem.properties.amazon_prime_start_date
            .date
            ? new Date(dbItem.properties.amazon_prime_start_date.date.start)
            : null;
        const maxStartDate = dbItem.properties.hbo_max_start_date.date
            ? new Date(dbItem.properties.hbo_max_start_date.date.start)
            : null;
        const youtubePremiumStartDate = dbItem.properties
            .youtube_premium_start_date.date
            ? new Date(dbItem.properties.youtube_premium_start_date.date.start)
            : null;
        const hasAcceptedAmazonPrimeTerms =
            dbItem.properties.accepted_amazon_prime_terms.checkbox || false;
        const hasAcceptedSpotifyTerms =
            dbItem.properties.accepted_spotify_terms.checkbox || false;
        const hasAcceptedHboMaxTerms =
            dbItem.properties.accepted_hbo_max_terms.checkbox || false;
        const hasAcceptedYoutubePremiumTerms =
            dbItem.properties.accepted_youtube_premium_terms.checkbox || false;

        const item = {
            id: dbItem.id,
            name: title,
            phone,
            groups: groups,
            spotifyStartDate,
            amazonPrimeStartDate,
            maxStartDate,
            youtubePremiumStartDate,
            hasAcceptedAmazonPrimeTerms,
            hasAcceptedSpotifyTerms,
            hasAcceptedHboMaxTerms,
            hasAcceptedYoutubePremiumTerms,
        };
        return item;
    });
};

/**
 * Retrieves all users from the Notion users database.
 * @returns {Promise<User[]>} - A promise that resolves to an array of users.
 */
export const getAllUsers = async () => {
    const { NOTION_USERS_DATASOURCE_ID } = process.env;

    if (!NOTION_USERS_DATASOURCE_ID) {
        throw new Error("Missing NOTION_USERS_DATASOURCE_ID");
    }

    const response = await notionClient.dataSources.query({
        data_source_id: NOTION_USERS_DATASOURCE_ID,
    });

    return extractUsersData(response);
};

/**
 * Retrieves a user from the Notion users database by phone number.
 * @param userPhone - The phone number of the user to retrieve.
 * @returns A promise that resolves to the user object or null if not found.
 */
export const getUserFromPhone = async (
    userPhone: string,
): Promise<User | null> => {
    logger.info(`mensaje de ${userPhone} `);

    if (userPhone === ADMIN_USER.phone) {
        return ADMIN_USER;
    }

    const { NOTION_USERS_DATASOURCE_ID } = process.env;

    if (!NOTION_USERS_DATASOURCE_ID) {
        throw new Error("Missing NOTION_USERS_DATASOURCE_ID");
    }

    const response = await notionClient.dataSources.query({
        data_source_id: NOTION_USERS_DATASOURCE_ID,
        filter: {
            property: "phone",
            phone_number: {
                contains: userPhone,
            },
        },
    });

    if (response.results.length === 0) {
        return null;
    }

    const users = extractUsersData(response);
    return users[0];
};

/**
 * Extracts user groups from a Notion database response.
 * @param response - The response from the Notion API.
 * @returns An array of group names.
 */
const extractGroupsData = (response: GetDataSourceResponse): Array<string> => {
    const databaseGroupsItems = response.properties.groups;

    // @ts-ignore
    return databaseGroupsItems.multi_select.options.reduce((acc, group) => {
        acc.push(group.name);
        return acc;
    }, []);
};

/**
 * Retrieves all user groups from the Notion users database.
 * @returns A promise that resolves to an array of group names.
 */
export const getAllUsersGroups = async (): Promise<Array<string>> => {
    try {
        const { NOTION_USERS_DATASOURCE_ID } = process.env;

        if (!NOTION_USERS_DATASOURCE_ID) {
            throw new Error("Missing NOTION_USERS_DATASOURCE_ID");
        }

        const response = await notionClient.dataSources.retrieve({
            data_source_id: NOTION_USERS_DATASOURCE_ID,
        });

        return extractGroupsData(response);
    } catch (error) {
        logger.error(error);
        return [];
    }
};

/**
 * Retrieves users from a specific group in the Notion users database.
 * @param groupName - The name of the group to retrieve users from.
 * @returns A promise that resolves to an array of user objects.
 */
export const getUsersFromGroup = async (groupName: string): Promise<User[]> => {
    const { NOTION_USERS_DATASOURCE_ID } = process.env;

    if (!NOTION_USERS_DATASOURCE_ID) {
        throw new Error("Missing NOTION_USERS_DATASOURCE_ID");
    }

    const response = await notionClient.dataSources.query({
        data_source_id: NOTION_USERS_DATASOURCE_ID,
        filter: {
            property: "groups",
            multi_select: {
                contains: groupName,
            },
        },
    });

    return extractUsersData(response);
};

/**
 * Retrieves a user from the Notion users database by name.
 * @param userName - The name of the user to retrieve.
 * @returns A promise that resolves to the user object or null if not found.
 */
export const getUserFromName = async (
    userName: string,
): Promise<User | null> => {
    const { NOTION_USERS_DATASOURCE_ID } = process.env;

    if (!NOTION_USERS_DATASOURCE_ID) {
        throw new Error("Missing NOTION_USERS_DATASOURCE_ID");
    }

    const response = await notionClient.dataSources.query({
        data_source_id: NOTION_USERS_DATASOURCE_ID,
        filter: {
            property: "name",
            title: {
                equals: userName,
            },
        },
    });

    if (response.results.length === 0) {
        return null;
    }

    const user = extractUsersData(response);
    return user[0];
};
