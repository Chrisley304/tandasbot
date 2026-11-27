import type { User } from "./notion/usersDB";

export interface Deptor {
    missingPayments: number;
    totalAmountOwed: number;
    creditBalance: number;
    user: User;
}
