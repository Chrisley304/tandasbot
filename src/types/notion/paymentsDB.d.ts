import type { PageObjectResponse } from "@notionhq/client";
import type {
    PropertyValueTitle,
    PropertyValueFormula,
    PropertyValueRelation,
    PropertyValueSelect,
    PropertyValueDate,
    PropertyValueNumber,
    PropertyValueRichText,
} from "./responses";

export type TandasPaymentsDBItem = PageObjectResponse & {
    properties: {
        overdue_payment: PropertyValueFormula;
        title: PropertyValueTitle;
        user: PropertyValueRelation;
        tanda: PropertyValueSelect;
        payment_date: PropertyValueDate;
        payment: PropertyValueNumber;
        paid_periods: PropertyValueNumber;
        next_payment: PropertyValueDate;
        voucher_path: PropertyValueRichText;
    };
};

export interface TandaPayment {
    id?: string;
    overduePayment?: boolean;
    title: string;
    userId: string;
    tanda: string;
    paymentDate: Date;
    payment: number;
    paidPeriods: number;
    nextPayment: Date;
    voucherPath: string;
    voucherFileUploadId?: string;
}
