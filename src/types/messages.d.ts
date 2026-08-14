export interface Message {
    body: string;
    type?: "text" | "image";
    alt?: string;
}
