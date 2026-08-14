import type {
    DatePropertyItemObjectResponse,
    FormulaPropertyItemObjectResponse,
    MultiSelectPropertyItemObjectResponse,
    PageObjectResponse,
    QueryDataSourceResponse,
    RichTextItemResponse,
    SelectPropertyItemObjectResponse,
} from "@notionhq/client";

/**
 * Database property values
 */

// export type PostResult = Extract<
//     QueryDataSourceResponse["results"][number],
//     { properties: Record<string, unknown> }
// >;

// type PropertyValueMap = PostResult["properties"];
// type PropertyValue = PropertyValueMap[string];

// type PropertyValueType = PropertyValue["type"];

// type ExtractedPropertyValue<TType extends PropertyValueType> = Extract<
//     PropertyValue,
//     { type: TType }
// >;

export type PropertyValueTitle = {
    type: "title";
    title: Array<RichTextItemResponse>;
    id: string;
};
export type PropertyValueRichText = {
    type: "rich_text";
    rich_text: Array<RichTextItemResponse>;
    id: string;
};
export type PropertyValueMultiSelect = MultiSelectPropertyItemObjectResponse;
export type PropertyValueSelect = SelectPropertyItemObjectResponse;
export type PropertyValueUrl = {
    type: "url";
    url: string | null;
    id: string;
};
export type PropertyValueDate = DatePropertyItemObjectResponse;
export type PropertyValueEditedTime = {
    type: "last_edited_time";
    last_edited_time: string;
    id: string;
};
export type PropertyValuePhone = {
    type: "phone_number";
    phone_number: string | null;
    id: string;
};
export type PropertyValueNumber = {
    type: "number";
    number: number | null;
    id: string;
};
export type PropertyValueFormula = {
    type: "formula";
    formula: { number?: number; boolean?: boolean; string?: string };
    object: "property_item";
    id: string;
};
export type PropertyValueCheckbox = {
    type: "checkbox";
    checkbox: boolean;
    id: string;
};
export type PropertyValueRelation = {
    type: "relation";
    relation: Array<{
        id: string;
    }>;
    id: string;
};
