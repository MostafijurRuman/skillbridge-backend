import { BookingStatus } from "../../enums/bookingStatus.enum";
import { prisma } from "../../lib/prisma";

const reviewInclude = {
  student: {
    select: {
      id: true,
      name: true,
      image: true,
    },
  },
  tutor: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          email: true,
        },
      },
    },
  },
} as const;

const createReview = async (
  studentId: string,
  tutorId: string,
  rating: number,
  comment: string
) => {
  // 1️ Check if booking exists and is completed
  const booking = await prisma.booking.findFirst({
    where: {
      studentId,
      tutorId,
      status: BookingStatus.COMPLETED,
    },
  });

  if (!booking) {
    throw new Error("You can only review a tutor after completing a session");
  }

  // 2️ Prevent duplicate review
  const existingReview = await prisma.review.findFirst({
    where: {
      studentId,
      tutorId,
    },
  });

  if (existingReview) {
    throw new Error("You have already reviewed this tutor");
  }

  // 3️ Create review
  const review = await prisma.review.create({
    data: {
      studentId,
      tutorId,
      rating,
      comment,
    },
  });

  // 4️ Update tutor average rating
  const allReviews = await prisma.review.findMany({
    where: { tutorId },
  });

  const avgRating =
    allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

  await prisma.tutorProfile.update({
    where: { id: tutorId },
    data: { rating: avgRating },
  });

  return review;
};

const getReviewsByTutorId = async (tutorId: string) => {
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id: tutorId },
    select: { id: true },
  });

  if (!tutor) {
    throw new Error("Tutor not found");
  }

  return prisma.review.findMany({
    where: { tutorId },
    include: reviewInclude,
    orderBy: { createdAt: "desc" },
  });
};

const getReviewByBookingId = async (bookingId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      studentId: true,
      tutorId: true,
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  const review = await prisma.review.findFirst({
    where: {
      studentId: booking.studentId,
      tutorId: booking.tutorId,
    },
    include: reviewInclude,
  });

  if (!review) {
    throw new Error("Review not found for this booking");
  }

  return review;
};

export const reviewService = {
  createReview,
  getReviewsByTutorId,
  getReviewByBookingId,
};
