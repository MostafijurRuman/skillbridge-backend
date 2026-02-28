
import { prisma } from "../../lib/prisma";
import { BookingStatus } from "../../enums/bookingStatus.enum";

const WEEK_DAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
] as const;

const getDayNameByIndex = (index: number): (typeof WEEK_DAYS)[number] => {
    const day = WEEK_DAYS[index];
    if (!day) {
        throw new Error("Invalid session date");
    }
    return day;
};

const getDayName = (date: Date) => getDayNameByIndex(date.getUTCDay());

const getPreviousDayName = (dayIndex: number) => getDayNameByIndex((dayIndex + 6) % 7);

const createBooking = async (
    studentId: string,
    tutorId: string,
    sessionDate: string
) => {
    const bookingTime = new Date(sessionDate);

    // Validate valid date
    if (isNaN(bookingTime.getTime())) {
        throw new Error("Invalid session date provided");
    }

    // 1. Check for Past Date
    if (bookingTime < new Date()) {
        throw new Error("Cannot book sessions in the past");
    }

    const bookingDayIndex = bookingTime.getUTCDay();
    const dayName = getDayName(bookingTime);
    const previousDayName = getPreviousDayName(bookingDayIndex);

    // 2. Check Tutor Availability by day only.
    // Includes previous day for overnight schedules handled by frontend.
    const tAvailability = await prisma.availability.findMany({
        where: {
            tutorId,
            OR: [
                {
                    day: {
                        equals: dayName,
                        mode: "insensitive",
                    },
                },
                {
                    day: {
                        equals: previousDayName,
                        mode: "insensitive",
                    },
                },
            ],
        },
    });

    if (!tAvailability || tAvailability.length === 0) {
        throw new Error("Tutor is not available on this day");
    }

    // 3. Check for Overlapping Bookings (assuming 1 hour duration)
    // We look for any booking that starts less than 1 hour before and less than 1 hour after this booking
    const oneHour = 60 * 60 * 1000;
    const existingBooking = await prisma.booking.findFirst({
        where: {
            tutorId,
            status: { not: BookingStatus.CANCELLED },
            sessionDate: {
                gt: new Date(bookingTime.getTime() - oneHour),
                lt: new Date(bookingTime.getTime() + oneHour),
            },
        },
    });

    if (existingBooking) {
        throw new Error("This time is already booked. Please try another session.");
    }

    return prisma.booking.create({
        data: {
            studentId,
            tutorId,
            sessionDate: bookingTime,
            status: BookingStatus.UPCOMING,
        },
    });
};

const getMyBookings = async (studentId: string) => {
    return prisma.booking.findMany({
        where: { studentId },
        include: {
            tutor: {
                include: {
                    user: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });
};

const getBookingById = async (bookingId: string, studentId: string) => {
    return prisma.booking.findFirst({
        where: {
            id: bookingId,
            studentId,
        },
        include: {
            tutor: {
                include: { user: true },
            },
            student: true,
        },
    });
};

const cancelBooking = async (bookingId: string, studentId: string) => {
    const booking = await prisma.booking.findFirst({
        where: { id: bookingId, studentId },
    });

    if (!booking) return null;

    if (booking.status === BookingStatus.CANCELLED) {
        return booking;
    }

    return prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
    });
};

const completeBooking = async (bookingId: string, userId: string) => {
    // 1. Get Tutor Profile ID from User ID
    const tutorProfile = await prisma.tutorProfile.findUnique({
        where: { userId },
    });

    if (!tutorProfile) {
        throw new Error("Tutor profile not found. Ensure you are registered as a tutor.");
    }

    // 2. Find the booking ensuring it belongs to this tutor
    const booking = await prisma.booking.findFirst({
        where: {
            id: bookingId,
            tutorId: tutorProfile.id,
        },
    });

    if (!booking) {
        throw new Error("Booking not found or you are not authorized to complete this booking");
    }

    if (booking.status === BookingStatus.COMPLETED) {
        throw new Error("Booking is already completed");
    }

    if (booking.status === BookingStatus.CANCELLED) {
        throw new Error("Cannot complete a cancelled booking");
    }

    // 3. Update status
    return prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.COMPLETED },
    });
};

export const bookingService = {
    createBooking,
    getMyBookings,
    getBookingById,
    cancelBooking,
    completeBooking,
};
