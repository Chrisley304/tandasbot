import type { User } from "@custom-types/notion/usersDB";
import dotenv from "dotenv";
import { USER_GROUPS } from "@enums/users";

dotenv.config();

export const ADMIN_USER: User = {
    id: "admin",
    name: process.env.ADMIN_NAME || "",
    phone: process.env.ADMIN_NUMBER || "",
    groups: [USER_GROUPS.ADMIN],
};
