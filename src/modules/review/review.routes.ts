import express, { Router } from "express";
import { reviewController } from "./review.controller";
import authChecker from "../../middlewares/authChecker";
import { UserRole } from "../../enums/role.enum";

const router = express.Router();

// Public read routes
router.get("/booking/:bookingId", reviewController.getReviewByBookingId);
router.get("/tutor/:tutorId", reviewController.getReviewsByTutorId);

// Student can create review only
router.post("/", authChecker(UserRole.STUDENT), reviewController.createReview);

export const reviewRouter: Router = router;
