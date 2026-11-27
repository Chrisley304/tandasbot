import type { QueryDataSourceResponse } from "@notionhq/client/build/src/api-endpoints";
import type {
    LegalsDatabaseItem,
    UserTandaLegal,
} from "@custom-types/notion/legalsDB";

import dotenv from "dotenv";
import { notionClient } from "./client";
import { getMexicoCityISODate, parseNotionDate } from "../datetimes";
import logger from "../logger";

dotenv.config();

const getLegalsDataSourceId = (): string => {
    const { NOTION_TANDAS_LEGALES_DATASOURCE_ID } = process.env;
    if (!NOTION_TANDAS_LEGALES_DATASOURCE_ID) {
        throw new Error("Missing NOTION_TANDAS_LEGALES_DATASOURCE_ID");
    }
    return NOTION_TANDAS_LEGALES_DATASOURCE_ID;
};

const extractLegalsData = (
    response: QueryDataSourceResponse,
): UserTandaLegal[] => {
    const items = response.results as LegalsDatabaseItem[];

    return items.map((item) => ({
        id: item.id,
        title: item.properties.Nombre?.title?.[0]?.plain_text || "",
        userId: item.properties.Usuario?.relation?.[0]?.id || "",
        tandaId: item.properties.Tanda?.relation?.[0]?.id || "",
        startDate: item.properties["Fecha inicio"]?.date?.start
            ? parseNotionDate(item.properties["Fecha inicio"].date.start)
            : null,
        acceptedRules: item.properties["Acepto reglas"]?.checkbox || false,
        creditBalance: item.properties["Saldo a favor"]?.number ?? 0,
    }));
};

/**
 * Retrieves the legal/membership record for a specific user and tanda.
 */
export const getUserTandaLegal = async (
    userId: string,
    tandaId: string,
): Promise<UserTandaLegal | null> => {
    const dataSourceId = getLegalsDataSourceId();

    const response = await notionClient.dataSources.query({
        data_source_id: dataSourceId,
        filter: {
            and: [
                {
                    property: "Usuario",
                    relation: { contains: userId },
                },
                {
                    property: "Tanda",
                    relation: { contains: tandaId },
                },
            ],
        },
    });

    if (response.results.length === 0) {
        return null;
    }

    return extractLegalsData(response)[0];
};

/**
 * Creates or updates the legal record for (user, tanda), setting "Acepto reglas" = true
 * and "Fecha inicio" if not already present.
 */
export const upsertUserTandaLegal = async (params: {
    userId: string;
    userName: string;
    tandaId: string;
    tandaName: string;
    acceptedRules?: boolean;
    startDate?: Date;
    creditBalance?: number;
}): Promise<UserTandaLegal> => {
    const dataSourceId = getLegalsDataSourceId();
    const existing = await getUserTandaLegal(params.userId, params.tandaId);

    if (existing) {
        const properties: Record<string, unknown> = {};
        if (params.acceptedRules !== undefined) {
            properties["Acepto reglas"] = { checkbox: params.acceptedRules };
        }
        if (params.startDate && !existing.startDate) {
            properties["Fecha inicio"] = {
                date: { start: getMexicoCityISODate(params.startDate) },
            };
        }
        if (params.creditBalance !== undefined) {
            properties["Saldo a favor"] = { number: params.creditBalance };
        }

        if (Object.keys(properties).length > 0) {
            try {
                await notionClient.pages.update({
                    page_id: existing.id,
                    // @ts-ignore
                    properties,
                });
            } catch (error) {
                logger.warn(
                    `Error updating legal record (ensure "Saldo a favor" exists if updating credit): ${String(error)}`,
                );
            }
        }

        return {
            ...existing,
            acceptedRules: params.acceptedRules ?? existing.acceptedRules,
            startDate: existing.startDate ?? params.startDate ?? null,
            creditBalance: params.creditBalance ?? existing.creditBalance,
        };
    }

    const startDate = params.startDate ?? new Date();
    const title = `Legales ${params.userName} - ${params.tandaName}`;

    const properties: Record<string, unknown> = {
        Nombre: {
            title: [{ text: { content: title } }],
        },
        Usuario: {
            relation: [{ id: params.userId }],
        },
        Tanda: {
            relation: [{ id: params.tandaId }],
        },
        "Fecha inicio": {
            date: { start: getMexicoCityISODate(startDate) },
        },
        "Acepto reglas": {
            checkbox: params.acceptedRules ?? true,
        },
    };

    if (params.creditBalance !== undefined) {
        properties["Saldo a favor"] = { number: params.creditBalance };
    }

    const created = await notionClient.pages.create({
        parent: {
            type: "data_source_id",
            data_source_id: dataSourceId,
        },
        // @ts-ignore
        properties,
    });

    return {
        id: created.id,
        title,
        userId: params.userId,
        tandaId: params.tandaId,
        startDate,
        acceptedRules: params.acceptedRules ?? true,
        creditBalance: params.creditBalance ?? 0,
    };
};

