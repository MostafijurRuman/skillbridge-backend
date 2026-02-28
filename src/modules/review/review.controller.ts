import { Request, Response } from "express";
import { reviewService } from "./review.service";

const createReview = async (req: Request, res: Response) => {
  try {
    const { tutorId, rating, comment } = req.body;

    const review = await reviewService.createReview(
      req.user!.id,
      tutorId,
      rating,
      comment
    );

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: review,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to submit review",
    });
  }
};

const getReviewsByTutorId = async (req: Request, res: Response) => {
  try {
    const reviews = await reviewService.getReviewsByTutorId(req.params.tutorId as string);

    res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message || "Failed to fetch tutor reviews",
    });
  }
};

const getReviewByBookingId = async (req: Request, res: Response) => {
  try {
    const review = await reviewService.getReviewByBookingId(req.params.bookingId as string);

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message || "Failed to fetch review by booking",
    });
  }
};

export const reviewController = {
  createReview,
  getReviewsByTutorId,
  getReviewByBookingId,
};
