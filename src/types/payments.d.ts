import { USER_GROUPS } from "@enums/users";
import type { User } from "./notion/usersDB";

export interface Payment {
    paymentDate: Date;
    amount: number;
    user: User;
    tanda: USER_GROUPS | string;
    voucherPath: string;
}
