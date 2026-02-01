import { UserRole } from "../enums/role.enum";

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                name: string;
                role: UserRole;
                isBanned: boolean;
            };
        }
    }
}
