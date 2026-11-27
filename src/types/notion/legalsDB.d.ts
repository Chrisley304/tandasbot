import type { PageObjectResponse } from "@notionhq/client";
import type {
    PropertyValueTitle,
    PropertyValueRelation,
    PropertyValueDate,
    PropertyValueCheckbox,
    PropertyValueNumber,
} from "./responses";

export type LegalsDatabaseItem = PageObjectResponse & {
    properties: {
        Nombre: PropertyValueTitle;
        Usuario: PropertyValueRelation;
        Tanda: PropertyValueRelation;
        "Fecha inicio": PropertyValueDate;
        "Acepto reglas": PropertyValueCheckbox;
        "Saldo a favor"?: PropertyValueNumber;
    };
};

export interface UserTandaLegal {
    id: string;
    title: string;
    userId: string;
    tandaId: string;
    startDate: Date | null;
    acceptedRules: boolean;
    creditBalance: number;
}
