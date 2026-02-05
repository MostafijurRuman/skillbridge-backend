import express, { Router } from "express";
import { adminController } from "./admin.controller";
import authChecker from "../../middlewares/authChecker";
import { UserRole } from "../../enums/role.enum";

const router = express.Router();

// Admin routes
router.get("/users", authChecker(UserRole.ADMIN), adminController.getUsers);
router.get("/bookings", authChecker(UserRole.ADMIN), adminController.getAllBookings);
router.patch("/users/:id", authChecker(UserRole.ADMIN), adminController.updateUserStatus);
router.get("/categories", authChecker(UserRole.ADMIN), adminController.getAllCategories);

export const adminRouter: Router = router;
