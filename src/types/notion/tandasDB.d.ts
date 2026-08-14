import type { PageObjectResponse } from "@notionhq/client";
import type {
    PropertyValueDate,
    PropertyValueFormula,
    PropertyValueNumber,
    PropertyValueRelation,
    PropertyValueSelect,
    PropertyValueTitle,
    PropertyValueCheckbox,
} from "./responses";
import { SUSCRIPTION_TYPES } from "@enums/suscriptions";

export type TandasDatabaseItem = PageObjectResponse & {
    properties: {
        is_active: PropertyValueCheckbox;
        name: PropertyValueTitle;
        suscription_type: PropertyValueSelect;
        payment_day: PropertyValueDate;
        total_cost: PropertyValueNumber;
        n_members: PropertyValueNumber;
        cost_per_member: PropertyValueFormula;
    };
};

export interface Tanda {
    id: string;
    isActive?: boolean;
    name: string;
    suscriptionType: SUSCRIPTION_TYPES | string;
    costPerUser: number;
    paymentDay: Date;
    totalCost: number;
    nMembers: number;
}
