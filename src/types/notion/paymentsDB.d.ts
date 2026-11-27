import type { PageObjectResponse } from "@notionhq/client";
import type {
    PropertyValueTitle,
    PropertyValueFormula,
    PropertyValueRelation,
    PropertyValueDate,
    PropertyValueNumber,
} from "./responses";

export type TandasPaymentsDBItem = PageObjectResponse & {
    properties: {
        Titulo: PropertyValueTitle;
        Usuario: PropertyValueRelation;
        Tanda: PropertyValueRelation;
        "Fecha pago": PropertyValueDate;
        Monto: PropertyValueNumber;
        "Siguiente pago": PropertyValueDate;
        "Periodos pagados"?: PropertyValueFormula;
        "Vencido?"?: PropertyValueFormula;
    };
};

export interface TandaPayment {
    id?: string;
    overduePayment?: boolean;
    title: string;
    userId: string;
    tandaId: string;
    tandaName?: string;
    paymentDate: Date;
    payment: number;
    paidPeriods?: number;
    nextPayment: Date;
    voucherFileUploadId?: string;
}
