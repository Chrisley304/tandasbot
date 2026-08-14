import type { PageObjectResponse } from "@notionhq/client";
import type {
    PropertyValueTitle,
    PropertyValuePhone,
    PropertyValueMultiSelect,
    PropertyValueDate,
    PropertyValueCheckbox,
} from "./responses";

export type UsersDatabaseItem = PageObjectResponse & {
    properties: {
        name: PropertyValueTitle;
        phone: PropertyValuePhone;
        groups: PropertyValueMultiSelect;
        spotify_start_date: PropertyValueDate;
        hbo_max_start_date: PropertyValueDate;
        amazon_prime_start_date: PropertyValueDate;
        accepted_amazon_prime_terms: PropertyValueCheckbox;
        accepted_spotify_terms: PropertyValueCheckbox;
        accepted_hbo_max_terms: PropertyValueCheckbox;
        accepted_youtube_premium_terms: PropertyValueCheckbox;
        youtube_premium_start_date: PropertyValueDate;
    };
};

export interface User {
    id: string;
    name: string;
    phone: string;
    groups: Array<string>;
    spotifyStartDate?: Date;
    maxStartDate?: Date;
    amazonPrimeStartDate?: Date;
    youtubePremiumStartDate?: Date;
    hasAcceptedAmazonPrimeTerms?: boolean;
    hasAcceptedSpotifyTerms?: boolean;
    hasAcceptedHboMaxTerms?: boolean;
    hasAcceptedYoutubePremiumTerms?: boolean;
}
