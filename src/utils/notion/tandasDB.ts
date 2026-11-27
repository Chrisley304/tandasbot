import type { QueryDataSourceResponse } from "@notionhq/client/build/src/api-endpoints";
import type { Tanda, TandasDatabaseItem } from "@custom-types/notion/tandasDB";
import type {
    TandaPayment,
    TandasPaymentsDBItem,
} from "@custom-types/notion/paymentsDB";

import dotenv from "dotenv";
import { notionClient } from "./client";

import { normalizeTandaName } from "../misc";
import { getMexicoCityISODate, parseNotionDate } from "../datetimes";

dotenv.config();

const TANDAS_CACHE_TTL_MS = 60_000;
let cachedTandas: Tanda[] | null = null;
let cachedTandasTimestamp = 0;

export const invalidateTandasCache = () => {
    cachedTandas = null;
    cachedTandasTimestamp = 0;
};

const getTandasListDataSourceId = (): string => {
    const { NOTION_TANDAS_LIST_DATASOURCE_ID } = process.env;
    if (!NOTION_TANDAS_LIST_DATASOURCE_ID) {
        throw new Error("Missing NOTION_TANDAS_LIST_DATASOURCE_ID");
    }
    return NOTION_TANDAS_LIST_DATASOURCE_ID;
};

const getPaymentsDataSourceId = (): string => {
    const { NOTION_TANDAS_PAYMENTS_DATASOURCE_ID } = process.env;
    if (!NOTION_TANDAS_PAYMENTS_DATASOURCE_ID) {
        throw new Error("Missing NOTION_TANDAS_PAYMENTS_DATASOURCE_ID");
    }
    return NOTION_TANDAS_PAYMENTS_DATASOURCE_ID;
};

/**
 * Extracts tanda data from a Notion API response.
 */
const extractTandasData = (response: QueryDataSourceResponse): Tanda[] => {
    const databaseItems = response.results as TandasDatabaseItem[];

    return databaseItems.map((dbItem) => {
        const name = dbItem.properties["Nombre tanda"]?.title?.[0]?.plain_text || "";
        const suscriptionType =
            dbItem.properties.Recurrencia?.select?.name || "monthly";
        const totalCost = dbItem.properties["Costo tanda"]?.number || 0;
        const nMembers = dbItem.properties["Numero de miembros"]?.number || 1;
        const costPerUser =
            dbItem.properties["Costo por miembro"]?.formula?.number ??
            totalCost / Math.max(1, nMembers);
        const paymentDay = dbItem.properties["Dia de pago"]?.date?.start
            ? parseNotionDate(dbItem.properties["Dia de pago"].date.start)
            : new Date();
        const isActive = dbItem.properties["Activo?"]?.checkbox || false;
        const password =
            dbItem.properties.password?.rich_text
                ?.map((rt) => rt.plain_text)
                .join("") || "";
        const rules =
            dbItem.properties["Reglas tanda"]?.rich_text
                ?.map((rt) => rt.plain_text)
                .join("") || "";

        return {
            id: dbItem.id,
            name,
            suscriptionType,
            costPerUser,
            paymentDay,
            totalCost,
            nMembers,
            isActive,
            password,
            rules,
        };
    });
};

/**
 * Gets all tandas from the Notion database (with short in-memory cache).
 */
export const getAllTandas = async (forceRefresh = false): Promise<Tanda[]> => {
    const now = Date.now();
    if (
        !forceRefresh &&
        cachedTandas &&
        now - cachedTandasTimestamp < TANDAS_CACHE_TTL_MS
    ) {
        return cachedTandas;
    }

    const response = await notionClient.dataSources.query({
        data_source_id: getTandasListDataSourceId(),
    });

    cachedTandas = extractTandasData(response);
    cachedTandasTimestamp = now;
    return cachedTandas;
};

/**
 * Gets all active tandas from the Notion database.
 */
export const getActiveTandas = async (
    forceRefresh = false,
): Promise<Tanda[]> => {
    const tandas = await getAllTandas(forceRefresh);
    return tandas.filter((tanda) => tanda.isActive);
};

/**
 * Finds a tanda by its Notion page ID.
 */
export const getTandaById = async (tandaId: string): Promise<Tanda | null> => {
    const tandas = await getAllTandas();
    return tandas.find((t) => t.id === tandaId) || null;
};

/**
 * Finds a tanda by name using normalized comparison (ignores emojis, accents, case).
 */
export const getTandaByName = async (
    tandaName: string,
): Promise<Tanda | null> => {
    const tandas = await getAllTandas();
    const target = normalizeTandaName(tandaName);
    if (!target) return null;

    return (
        tandas.find((t) => normalizeTandaName(t.name) === target) ||
        tandas.find((t) => normalizeTandaName(t.name).includes(target)) ||
        null
    );
};

/**
 * Extracts tanda payments data from a Notion API response.
 */
const extractTandaPaymentsData = (
    response: QueryDataSourceResponse,
): TandaPayment[] => {
    const databaseItems = response.results as TandasPaymentsDBItem[];

    return databaseItems.map((dbItem) => ({
        id: dbItem.id,
        title: dbItem.properties.Titulo?.title?.[0]?.plain_text || "",
        overduePayment:
            dbItem.properties["Vencido?"]?.formula?.boolean || false,
        userId: dbItem.properties.Usuario?.relation?.[0]?.id || "",
        tandaId: dbItem.properties.Tanda?.relation?.[0]?.id || "",
        paymentDate: dbItem.properties["Fecha pago"]?.date?.start
            ? parseNotionDate(dbItem.properties["Fecha pago"].date.start)
            : new Date(),
        payment: dbItem.properties.Monto?.number || 0,
        paidPeriods:
            dbItem.properties["Periodos pagados"]?.formula?.number ?? undefined,
        nextPayment: dbItem.properties["Siguiente pago"]?.date?.start
            ? parseNotionDate(dbItem.properties["Siguiente pago"].date.start)
            : new Date(),
    }));
};

/**
 * Gets the valid payments (not overdue) of a tanda by tandaId.
 */
export const getTandaValidPayments = async (
    tandaId: string,
): Promise<TandaPayment[]> => {
    const response = await notionClient.dataSources.query({
        data_source_id: getPaymentsDataSourceId(),
        filter: {
            and: [
                {
                    property: "Tanda",
                    relation: {
                        contains: tandaId,
                    },
                },
                {
                    property: "Vencido?",
                    formula: {
                        checkbox: {
                            equals: false,
                        },
                    },
                },
            ],
        },
        sorts: [
            {
                property: "Siguiente pago",
                direction: "descending",
            },
        ],
    });

    return extractTandaPaymentsData(response);
};

/**
 * Gets the last N payments of a user in a tanda (ordered by Siguiente pago desc).
 */
export const getLastUserTandaPayments = async (
    userId: string,
    tandaId: string,
    limit = 3,
): Promise<TandaPayment[]> => {
    const response = await notionClient.dataSources.query({
        data_source_id: getPaymentsDataSourceId(),
        page_size: limit,
        filter: {
            and: [
                {
                    property: "Usuario",
                    relation: {
                        contains: userId,
                    },
                },
                {
                    property: "Tanda",
                    relation: {
                        contains: tandaId,
                    },
                },
            ],
        },
        sorts: [
            {
                property: "Siguiente pago",
                direction: "descending",
            },
        ],
    });

    return extractTandaPaymentsData(response);
};

/**
 * Adds a new payment to the Listado de Pagos database in Notion.
 */
export const addPaymentToTanda = async (payment: TandaPayment) => {
    const properties: Record<string, unknown> = {
        Titulo: {
            title: [
                {
                    text: {
                        content: payment.title,
                    },
                },
            ],
        },
        Usuario: {
            relation: [{ id: payment.userId }],
        },
        Tanda: {
            relation: [{ id: payment.tandaId }],
        },
        "Fecha pago": {
            date: {
                start: getMexicoCityISODate(payment.paymentDate),
            },
        },
        Monto: {
            number: payment.payment,
        },
        "Siguiente pago": {
            date: {
                start: getMexicoCityISODate(payment.nextPayment),
            },
        },
    };

    if (payment.voucherFileUploadId) {
        properties.Comprobante = {
            type: "files",
            files: [
                {
                    type: "file_upload",
                    file_upload: {
                        id: payment.voucherFileUploadId,
                    },
                },
            ],
        };
    }

    await notionClient.pages.create({
        parent: {
            type: "data_source_id",
            data_source_id: getPaymentsDataSourceId(),
        },
        icon: {
            type: "emoji",
            emoji: "💵",
        },
        // @ts-ignore
        properties,
    });
};

/**
 * Updates the "Siguiente pago" date on an existing payment record.
 */
export const updatePaymentNextPaymentDate = async (
    paymentId: string,
    nextPayment: Date,
): Promise<void> => {
    await notionClient.pages.update({
        page_id: paymentId,
        properties: {
            "Siguiente pago": {
                // @ts-ignore
                date: {
                    start: getMexicoCityISODate(nextPayment),
                },
            },
        },
    });
};

/**
 * Updates "Costo tanda" for a tanda in Notion and invalidates cache.
 */
export const updateTandaPrice = async (
    tandaId: string,
    newTotalCost: number,
): Promise<void> => {
    await notionClient.pages.update({
        page_id: tandaId,
        properties: {
            "Costo tanda": {
                number: newTotalCost,
            },
        },
    });
    invalidateTandasCache();
};

/**
 * Updates "password" for a tanda in Notion and invalidates cache.
 */
export const updateTandaPassword = async (
    tandaId: string,
    newPassword: string,
): Promise<void> => {
    await notionClient.pages.update({
        page_id: tandaId,
        properties: {
            password: {
                rich_text: [
                    {
                        type: "text",
                        text: {
                            content: newPassword,
                        },
                    },
                ],
            },
        },
    });
    invalidateTandasCache();
};
