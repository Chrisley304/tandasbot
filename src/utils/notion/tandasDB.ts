import type { User } from "@custom-types/notion/usersDB";
import type { QueryDataSourceResponse } from "@notionhq/client/build/src/api-endpoints";
import type { Tanda, TandasDatabaseItem } from "@custom-types/notion/tandasDB";
import type {
    TandaPayment,
    TandasPaymentsDBItem,
} from "@custom-types/notion/paymentsDB";

import dotenv from "dotenv";
import { notionClient } from "./client";

import { textToSnakeCase } from "../misc";
import { getMexicoCityISODate } from "../datetimes";

dotenv.config();

/**
 * Extracts tanda data from a Notion API response.
 */
const extractTandasData = (response: QueryDataSourceResponse): Tanda[] => {
    const databaseItems = response.results as TandasDatabaseItem[];

    return databaseItems.map((dbItem) => {
        const name = dbItem.properties.name.title[0].plain_text;
        const suscriptionType =
            dbItem.properties.suscription_type.select.name || "";
        const costPerUser =
            dbItem.properties.cost_per_member.formula.number || 0;
        const paymentDay = new Date(dbItem.properties.payment_day.date.start);
        const totalCost = dbItem.properties.total_cost.number || 0;
        const nMembers = dbItem.properties.n_members.number || 0;
        const isActive = dbItem.properties.is_active.checkbox || false;

        const item = {
            id: dbItem.id,
            name,
            suscriptionType,
            costPerUser,
            paymentDay,
            totalCost,
            nMembers,
            isActive,
        };
        return item;
    });
};

/**
 * Gets all tandas from the Notion database.
 */
export const getAllTandas = async (): Promise<Tanda[]> => {
    const { NOTION_TANDAS_LIST_DATASOURCE_ID } = process.env;

    if (!NOTION_TANDAS_LIST_DATASOURCE_ID) {
        throw new Error("Missing NOTION_TANDAS_LIST_DATASOURCE_ID");
    }

    const response = await notionClient.dataSources.query({
        data_source_id: NOTION_TANDAS_LIST_DATASOURCE_ID,
    });

    return extractTandasData(response);
};

/**
 * Gets a tanda by its name.
 */
export const getTandaByName = async (
    tandaName: string
): Promise<Tanda | null> => {
    const { NOTION_TANDAS_LIST_DATASOURCE_ID } = process.env;

    if (!NOTION_TANDAS_LIST_DATASOURCE_ID) {
        throw new Error("Missing NOTION_TANDAS_LIST_DATASOURCE_ID");
    }

    const response = await notionClient.dataSources.query({
        data_source_id: NOTION_TANDAS_LIST_DATASOURCE_ID,
        filter: {
            property: "name",
            title: {
                equals: tandaName,
            },
        },
    });

    if (response.results.length === 0) {
        return null;
    }

    const tanda = extractTandasData(response);
    return tanda[0];
};

/**
 * Extracts tanda payments data from a Notion API response.
 */
const extractTandaPaymentsData = (
    response: QueryDataSourceResponse
): TandaPayment[] => {
    const databaseItems = response.results as TandasPaymentsDBItem[];

    return databaseItems.map((dbItem) => {
        const title = dbItem.properties.title.title[0].plain_text;
        const overduePayment =
            dbItem.properties.overdue_payment.formula.boolean || false;
        const userId = dbItem.properties.user.relation[0].id;
        const tanda = dbItem.properties.tanda.select.name;
        const paymentDate = new Date(dbItem.properties.payment_date.date.start);
        const payment = dbItem.properties.payment.number || 0;
        const paidPeriods = dbItem.properties.paid_periods.number;
        const nextPayment = new Date(dbItem.properties.next_payment.date.start);
        const voucherPath =
            dbItem.properties.voucher_path.rich_text.length > 0
                ? dbItem.properties.voucher_path.rich_text[0].plain_text
                : "";

        return {
            id: dbItem.id,
            title,
            overduePayment,
            userId,
            tanda,
            paymentDate,
            payment,
            paidPeriods,
            nextPayment,
            voucherPath,
        };
    });
};

/**
 * Gets the valid payments (not due) of a user in a tanda.
 * @param userId - The ID of the user.
 * @param tandaName - The name of the tanda.
 * @returns A promise that resolves to an array of tanda payments or null if none found.
 */
export const getUserTandaValidPayments = async (
    userId: string,
    tandaName: string
): Promise<TandaPayment[] | null> => {
    const { NOTION_TANDAS_PAYMENTS_DATASOURCE_ID } = process.env;

    if (!NOTION_TANDAS_PAYMENTS_DATASOURCE_ID) {
        throw new Error("Missing NOTION_TANDAS_PAYMENTS_DATASOURCE_ID");
    }

    const response = await notionClient.dataSources.query({
        data_source_id: NOTION_TANDAS_PAYMENTS_DATASOURCE_ID,
        filter: {
            and: [
                {
                    property: "user",
                    relation: {
                        contains: userId,
                    },
                },
                {
                    property: "tanda",
                    select: {
                        equals: tandaName,
                    },
                },
                {
                    property: "overdue_payment",
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
                property: "next_payment",
                direction: "descending",
            },
        ],
    });

    if (response.results.length === 0) {
        return null;
    }

    return extractTandaPaymentsData(response);
};

/**
 * Gets the valid payments (not due) of a user in a tanda.
 * @param tandaName - The name of the tanda.
 * @returns A promise that resolves to an array of tanda payments or null if none found.
 */
export const getTandaValidPayments = async (
    tandaName: string
): Promise<TandaPayment[] | null> => {
    const { NOTION_TANDAS_PAYMENTS_DATASOURCE_ID } = process.env;

    if (!NOTION_TANDAS_PAYMENTS_DATASOURCE_ID) {
        throw new Error("Missing NOTION_TANDAS_PAYMENTS_DATASOURCE_ID");
    }

    const response = await notionClient.dataSources.query({
        data_source_id: NOTION_TANDAS_PAYMENTS_DATASOURCE_ID,
        filter: {
            and: [
                {
                    property: "tanda",
                    select: {
                        equals: tandaName,
                    },
                },
                {
                    property: "overdue_payment",
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
                property: "next_payment",
                direction: "descending",
            },
        ],
    });

    if (response.results.length === 0) {
        return null;
    }

    return extractTandaPaymentsData(response);
};

/**
 * Gets the last 3 payments of a user in a tanda.
 * @param userId - The ID of the user.
 * @param tandaName - The name of the tanda.
 * @returns A promise that resolves to an array of tanda payments or null if none found.
 */
export const getLastUserTandaPayments = async (
    userId: string,
    tandaName: string
): Promise<TandaPayment[] | null> => {
    const { NOTION_TANDAS_PAYMENTS_DATASOURCE_ID } = process.env;

    if (!NOTION_TANDAS_PAYMENTS_DATASOURCE_ID) {
        throw new Error("Missing NOTION_TANDAS_PAYMENTS_DATASOURCE_ID");
    }

    const response = await notionClient.dataSources.query({
        data_source_id: NOTION_TANDAS_PAYMENTS_DATASOURCE_ID,
        page_size: 3,
        filter: {
            and: [
                {
                    property: "user",
                    relation: {
                        contains: userId,
                    },
                },
                {
                    property: "tanda",
                    select: {
                        equals: tandaName,
                    },
                },
            ],
        },
        sorts: [
            {
                property: "next_payment",
                direction: "descending",
            },
        ],
    });

    if (response.results.length === 0) {
        return null;
    }

    return extractTandaPaymentsData(response);
};

/**
 * Add a new payment to the Notion database
 * @param payment - The payment to add.
 */
export const addPaymentToTanda = async (payment: TandaPayment) => {
    const { NOTION_TANDAS_PAYMENTS_DATASOURCE_ID } = process.env;

    if (!NOTION_TANDAS_PAYMENTS_DATASOURCE_ID) {
        throw new Error("Missing NOTION_TANDAS_PAYMENTS_DATASOURCE_ID");
    }

    await notionClient.pages.create({
        parent: {
            type: "data_source_id",
            data_source_id: NOTION_TANDAS_PAYMENTS_DATASOURCE_ID,
        },
        icon: {
            type: "emoji",
            emoji: "💵",
        },
        properties: {
            title: {
                title: [
                    {
                        text: {
                            content: payment.title,
                        },
                    },
                ],
            },
            user: {
                // @ts-ignore
                relation: [
                    {
                        id: payment.userId,
                    },
                ],
            },
            tanda: {
                // @ts-ignore
                select: {
                    name: payment.tanda,
                },
            },
            payment_date: {
                // @ts-ignore
                date: {
                    start: getMexicoCityISODate(payment.paymentDate),
                },
            },
            payment: {
                // @ts-ignore
                number: payment.payment,
            },
            paid_periods: {
                // @ts-ignore
                number: payment.paidPeriods,
            },
            next_payment: {
                // @ts-ignore
                date: {
                    start: getMexicoCityISODate(payment.nextPayment),
                },
            },
            voucher_path: {
                // @ts-ignore
                rich_text: [
                    {
                        type: "text",
                        text: {
                            content: payment.voucherPath,
                        },
                    },
                ],
            },
            voucher_image: {
                type: "files",
                files: [
                    {
                        type: "file_upload",
                        file_upload: {
                            id: payment.voucherFileUploadId,
                        },
                    },
                ],
            },
        },
    });
};

/**
 * Marks that a user has accepted the terms of a tanda.
 * @param {string} tandaName - The name of the tanda.
 * @param user - The user who accepted the terms.
 */
export const userAcceptTandaTermsHandler = async (
    tandaName: string,
    user: User
) => {
    const { NOTION_USERS_DATASOURCE_ID } = process.env;

    if (!NOTION_USERS_DATASOURCE_ID) {
        throw new Error("Missing NOTION_USERS_DATASOURCE_ID");
    }

    await notionClient.pages.update({
        page_id: user.id,
        properties: {
            [`accepted_${textToSnakeCase(tandaName)}_terms`]: {
                checkbox: true,
            },
        },
    });
};
