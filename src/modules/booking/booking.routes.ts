import express, { Router } from "express";
import { bookingController } from "./booking.controller";
import authChecker from "../../middlewares/authChecker";
import { UserRole } from "../../enums/role.enum";

const router = express.Router();

// Student booking routes
router.post("/", authChecker(UserRole.STUDENT), bookingController.createBooking);
router.get("/", authChecker(UserRole.STUDENT), bookingController.getMyBookings);
router.get("/:id", authChecker(UserRole.STUDENT), bookingController.getBookingDetails);
router.patch("/:id/cancel", authChecker(UserRole.STUDENT), bookingController.cancelBooking);
router.patch("/:id/complete", authChecker(UserRole.TUTOR), bookingController.completeBooking);

export const bookingRouter: Router = router;
