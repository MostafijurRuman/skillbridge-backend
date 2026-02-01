import { auth as betterAuth } from "../lib/auth";
import { NextFunction, Request, Response } from "express";

import { UserRole } from "../enums/role.enum";

const authChecker = (...roles: UserRole[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const session = await betterAuth.api.getSession({
                headers: req.headers as any,
            });

            if (!session) {
                return res.status(401).json({
                    success: false,
                    message: "You are not authorized!",
                });
            }

            // Block banned users
            if (session.user.isBanned) {
                return res.status(403).json({
                    success: false,
                    message: "Your account has been banned!",
                });
            }

            req.user = {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name,
                role: session.user.role as UserRole,
                isBanned: session.user.isBanned ?? false,
            };

            // Role-based authorization
            if (roles.length && !roles.includes(req.user!.role)) {
                return res.status(403).json({
                    success: false,
                    message: "Forbidden! You don't have permission to access this resource!",
                });
            }

            next();
        } catch (err) {
            next(err);
        }
    };
};

export default authChecker;
