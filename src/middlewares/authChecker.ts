import { auth as betterAuth } from "../lib/auth";
import { NextFunction, Request, Response } from "express";

import { UserRole } from "../enums/role.enum";
import { prisma } from "../lib/prisma";

const ROLE_ALIASES: Record<string, UserRole> = {
    [UserRole.STUDENT]: UserRole.STUDENT,
    [UserRole.TUTOR]: UserRole.TUTOR,
    [UserRole.ADMIN]: UserRole.ADMIN,
    STUDETN: UserRole.STUDENT, // Legacy typo fallback
};

const normalizeRole = (role: unknown): UserRole | null => {
    if (typeof role !== "string") return null;
    const normalized = role.trim().toUpperCase();
    return ROLE_ALIASES[normalized] ?? null;
};

const extractBearerToken = (authorization?: string): string | null => {
    if (!authorization) return null;
    const [scheme, token] = authorization.trim().split(/\s+/);
    if (!scheme || !token) return null;
    if (scheme.toLowerCase() !== "bearer") return null;
    return token;
};

type ResolvedUser = {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isBanned: boolean;
};

const resolveUserFromBearerToken = async (token: string): Promise<ResolvedUser | null> => {
    const session = await prisma.session.findUnique({
        where: { token },
        select: {
            expiresAt: true,
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    isBanned: true,
                },
            },
        },
    });

    if (!session || session.expiresAt <= new Date()) return null;

    const role = normalizeRole(session.user.role);
    if (!role) return null;

    return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role,
        isBanned: session.user.isBanned,
    };
};

const authChecker = (...roles: UserRole[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const bearerToken = extractBearerToken(req.headers.authorization);
            let resolvedUser: ResolvedUser | null = null;

            // Priority 1: explicit bearer token from client
            if (bearerToken) {
                resolvedUser = await resolveUserFromBearerToken(bearerToken);
            }

            // Priority 2: better-auth cookie/session
            if (!resolvedUser) {
                const session = await betterAuth.api.getSession({
                    headers: req.headers as any,
                });

                if (!session) {
                    return res.status(401).json({
                        success: false,
                        message: "You are not authorized!",
                    });
                }

                const dbUser = await prisma.user.findUnique({
                    where: { id: session.user.id },
                    select: {
                        role: true,
                        isBanned: true,
                    },
                });

                if (!dbUser) {
                    return res.status(401).json({
                        success: false,
                        message: "You are not authorized!",
                    });
                }

                const role = normalizeRole(dbUser.role);
                if (!role) {
                    return res.status(403).json({
                        success: false,
                        message: "Forbidden! Invalid user role in session.",
                    });
                }

                resolvedUser = {
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.name,
                    role,
                    isBanned: dbUser.isBanned,
                };
            }

            if (!resolvedUser) {
                return res.status(401).json({
                    success: false,
                    message: "You are not authorized!",
                });
            }

            if (resolvedUser.isBanned) {
                return res.status(403).json({
                    success: false,
                    message: "Your account has been banned!",
                });
            }

            req.user = {
                id: resolvedUser.id,
                email: resolvedUser.email,
                name: resolvedUser.name,
                role: resolvedUser.role,
                isBanned: resolvedUser.isBanned,
            };

            // Role-based authorization
            if (roles.length && !roles.includes(resolvedUser.role)) {
                return res.status(403).json({
                    success: false,
                    message: "Forbidden! You don't have permission to access this resource!",
                    meta: {
                        requiredRoles: roles,
                        currentRole: resolvedUser.role,
                    },
                });
            }

            next();
        } catch (err) {
            next(err);
        }
    };
};

export default authChecker;
