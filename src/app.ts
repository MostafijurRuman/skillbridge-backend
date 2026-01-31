import express, { type Application, type Request, type Response } from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";

const app: Application = express();

// Better Auth Routes
app.all("/api/auth/*path", toNodeHandler(auth));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Route
app.get("/", (req: Request, res: Response) => {
    res.status(200).json({
        message: "Welcome to SkillBridge Backend Service",
    });
});

export default app;