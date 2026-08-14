import { User } from "./notion/usersDB";

export type Deptor = {
    user: User;
    missingPayments: number;
};
