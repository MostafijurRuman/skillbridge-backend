import { prisma } from "../../lib/prisma";

// =======================
// Public Services
// =======================

const getTutors = (filters: any) => {
  const where: any = {};

  if (filters?.price) {
    where.pricePerHr = { lte: Number(filters.price) };
  }

  if (filters?.rating) {
    where.rating = { gte: Number(filters.rating) };
  }

  if (filters?.category) {
    where.categories = {
      some: { name: filters.category },
    };
  }

  return prisma.tutorProfile.findMany({
    where,
    include: {
      user: true,
      categories: true,
    },
  });
};

const getTutorById = (id: string) => {
  return prisma.tutorProfile.findUnique({
    where: { id },
    include: {
      user: true,
      categories: true,
      availability: true,
      reviews: true,
    },
  });
};

// =======================
// Tutor Profile Services
// =======================

const createProfile = async (userId: string, data: any) => {
  const existingProfile = await prisma.tutorProfile.findUnique({
    where: { userId },
  });

  if (existingProfile) {
    throw new Error("Tutor profile already exists");
  }

  if (!data || !data.categoryIds || data.categoryIds.length === 0) {
    throw new Error("At least one category is required");
  }

  const validCategoriesCount = await prisma.category.count({
    where: {
      id: { in: data.categoryIds },
    },
  });

  if (validCategoriesCount !== data.categoryIds.length) {
    throw new Error("One or more category IDs are invalid");
  }

  return prisma.tutorProfile.create({
    data: {
      userId,
      bio: data.bio,
      pricePerHr: Number(data.pricePerHr),
      categories: {
        connect: data.categoryIds.map((id: string) => ({ id })),
      },
    },
    include: {
      user: true,
      categories: true,
    },
  });
};

const updateProfile = async (userId: string, data: any) => {
  const existingProfile = await prisma.tutorProfile.findUnique({
    where: { userId },
  });

  if (!existingProfile) {
    throw new Error("Tutor profile not found. Please create profile first.");
  }

  // Validate categories if they are being updated and not empty
  if (data && data.categoryIds && data.categoryIds.length > 0) {
    const validCategoriesCount = await prisma.category.count({
      where: {
        id: { in: data.categoryIds },
      },
    });

    if (validCategoriesCount !== data.categoryIds.length) {
      throw new Error("One or more category IDs are invalid");
    }
  }

  const updateData: any = {};
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.pricePerHr !== undefined) updateData.pricePerHr = Number(data.pricePerHr);

  if (data.categoryIds !== undefined) {
    updateData.categories = {
      set: data.categoryIds.map((id: string) => ({ id })),
    };
  }

  return prisma.tutorProfile.update({
    where: { userId },
    data: updateData,
    include: {
      user: true,
      categories: true,
    },
  });
};

// =======================
// Availability Services
// =======================

const setAvailability = async (userId: string, slots: any[]) => {
  const tutor = await prisma.tutorProfile.findUnique({
    where: { userId },
  });

  if (!tutor) {
    throw new Error("Tutor profile not found");
  }

  // Remove old slots
  await prisma.availability.deleteMany({
    where: { tutorId: tutor.id },
  });

  // Create new slots
  return prisma.availability.createMany({
    data: slots.map((slot) => ({
      tutorId: tutor.id,
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
    })),
  });
};

const getAvailability = async (userId: string) => {
  const tutor = await prisma.tutorProfile.findUnique({
    where: { userId },
  });

  if (!tutor) {
    throw new Error("Tutor profile not found");
  }

  return prisma.availability.findMany({
    where: { tutorId: tutor.id },
    orderBy: [
      { day: "asc" },
      { startTime: "asc" },
    ],
  });
};

// =======================
// Dashboard Service
// =======================

const getTutorDashboard = async (userId: string) => {
  return prisma.tutorProfile.findUnique({
    where: { userId },
    include: {
      bookings: true,
      reviews: true,
      availability: true,
      categories: true,
    },
  });
};

// =======================
// Export Services
// =======================

export const tutorService = {
  getTutors,
  getTutorById,
  createProfile,
  updateProfile,
  setAvailability,
  getAvailability,
  getTutorDashboard,
};
