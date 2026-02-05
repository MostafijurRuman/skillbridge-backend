import { prisma } from "../../lib/prisma";

const getAllUsers = async () => {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isBanned: true,
      bannedAt: true,
      createdAt: true,
    },
  });
};

const getAllBookings = async () => {
  return prisma.booking.findMany({
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      tutor: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const updateUserStatus = async (id: string, isBanned: boolean) => {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return prisma.user.update({
    where: { id },
    data: {
      isBanned,
      bannedAt: isBanned ? new Date() : null,
    },
  });
};

const getAllCategories = async () => {
  return prisma.category.findMany();
};

export const adminService = {
  getAllUsers,
  getAllBookings,
  updateUserStatus,
  getAllCategories,
};
