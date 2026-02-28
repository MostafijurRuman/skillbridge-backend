import { Router } from "express";
import { authController } from "./auth.controller";
import authChecker from "../../middlewares/authChecker";

const router = Router();

// Custom route to get current user
router.get("/me", authChecker(), authController.getMe);
router.patch("/me", authChecker(), authController.updateMe);

export default router;
