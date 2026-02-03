import express, { type Application, type Request, type Response } from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { notFound } from "./middlewares/notFound";
import errorHandler from "./middlewares/globalErrorHandling";
import authRouter from "./modules/auth/auth.routes";
import { categoryRouter } from "./modules/category/category";
import { tutorRouter } from "./modules/tutor/tutor.routes";
import { bookingRouter } from "./modules/booking/booking.routes";
import { reviewRouter } from "./modules/review/review.routes";

const app: Application = express();

// Middleware
app.use(cors({
    origin: process.env.CLIENT_APP_URL || "http://localhost:3000",
    credentials: true
}))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/tutors", tutorRouter);
app.use("/api/admin", categoryRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/reviews", reviewRouter);

// Better Auth Routes
app.all("/api/auth/*path", toNodeHandler(auth));
/**
 * Auth Routes (Better Auth)
 *
 * POST /api/auth/sign-up/email   → Register user
 * POST /api/auth/sign-in/email   → Login user
 * POST /api/auth/sign-out        → Logout user
 * GET  /api/auth/session         → Get current session
 *
 * Uses cookie-based authentication (send requests with credentials).
 */

// Basic Route
app.get("/", (req: Request, res: Response) => {
    res.status(200).json({
        message: "Welcome to SkillBridge Backend Service",
    });
});
app.use(notFound);

app.use(errorHandler);

export default app;