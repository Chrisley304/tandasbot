import type { PageObjectResponse } from "@notionhq/client";
import type {
    PropertyValueTitle,
    PropertyValuePhone,
    PropertyValueCheckbox,
    PropertyValueRelation,
} from "./responses";

export type UsersDatabaseItem = PageObjectResponse & {
    properties: {
        Nombre: PropertyValueTitle;
        Telefono: PropertyValuePhone;
        "Admin?": PropertyValueCheckbox;
        Tandas: PropertyValueRelation;
    };
};

export interface User {
    id: string;
    name: string;
    phone: string;
    isAdmin: boolean;
    tandaIds: string[];
}
