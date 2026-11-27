import type { User } from "./notion/usersDB";

export interface Payment {
    paymentDate: Date;
    amount: number;
    user: User;
    tanda: string;
    voucherPath: string;
}
