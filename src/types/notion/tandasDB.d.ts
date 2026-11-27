import type { PageObjectResponse } from "@notionhq/client";
import type {
    PropertyValueDate,
    PropertyValueFormula,
    PropertyValueNumber,
    PropertyValueRichText,
    PropertyValueSelect,
    PropertyValueTitle,
    PropertyValueCheckbox,
} from "./responses";
import { SUSCRIPTION_TYPES } from "@enums/suscriptions";

export type TandasDatabaseItem = PageObjectResponse & {
    properties: {
        "Activo?": PropertyValueCheckbox;
        "Nombre tanda": PropertyValueTitle;
        Recurrencia: PropertyValueSelect;
        "Dia de pago": PropertyValueDate;
        "Costo tanda": PropertyValueNumber;
        "Numero de miembros": PropertyValueNumber;
        "Costo por miembro": PropertyValueFormula;
        password?: PropertyValueRichText;
        "Reglas tanda"?: PropertyValueRichText;
    };
};

export interface Tanda {
    id: string;
    isActive: boolean;
    name: string;
    suscriptionType: SUSCRIPTION_TYPES | string;
    costPerUser: number;
    paymentDay: Date;
    totalCost: number;
    nMembers: number;
    password: string;
    rules: string;
}
