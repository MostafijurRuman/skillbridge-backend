import { Request, Response } from "express";
import { bookingService } from "./booking.service";

const createBooking = async (req: Request, res: Response) => {
  try {
    const booking = await bookingService.createBooking(
      req.user!.id,
      req.body.tutorId,
      req.body.sessionDate
    );

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: booking,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create booking",
    });
  }
};

const getMyBookings = async (req: Request, res: Response) => {
  const bookings = await bookingService.getMyBookings(req.user!.id);

  res.status(200).json({
    success: true,
    data: bookings,
  });
};

const getBookingDetails = async (req: Request, res: Response) => {
  const booking = await bookingService.getBookingById(
    req.params.id as string,
    req.user!.id
  );

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found",
    });
  }

  res.status(200).json({
    success: true,
    data: booking,
  });
};

const cancelBooking = async (req: Request, res: Response) => {
  try {
    const booking = await bookingService.cancelBooking(
      req.params.id as string,
      req.user!.id
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or not owned by you",
      });
    }

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: booking,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
    });
  }
};

export const bookingController = {
  createBooking,
  getMyBookings,
  getBookingDetails,
  cancelBooking,
};
