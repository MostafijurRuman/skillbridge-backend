import { Router } from "express";
import { tutorController } from "./tutor.controller";
import authChecker from "../../middlewares/authChecker";
import { UserRole } from "../../enums/role.enum";

const router = Router();

// Public routes
router.get("/", tutorController.listTutors);
router.get("/:id", tutorController.tutorDetails);

// Tutor private routes
router.get("/dashboard/me", authChecker(UserRole.TUTOR), tutorController.getTutorDashboard);
router.get("/availability/me", authChecker(UserRole.TUTOR), tutorController.getAvailability);
router.post("/profile", authChecker(UserRole.TUTOR), tutorController.createTutorProfile);
router.patch("/profile", authChecker(UserRole.TUTOR), tutorController.updateTutorProfile);
router.put("/availability", authChecker(UserRole.TUTOR), tutorController.setAvailability);
router.patch("/availability/:id", authChecker(UserRole.TUTOR), tutorController.updateAvailability);
router.delete("/availability/:id", authChecker(UserRole.TUTOR), tutorController.removeAvailability);

export const tutorRouter = router;
