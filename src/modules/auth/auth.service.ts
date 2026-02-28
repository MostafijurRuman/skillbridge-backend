import { prisma } from "../../lib/prisma";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  isBanned: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
} as const;

type UpdateMePayload = {
  name?: unknown;
  image?: unknown;
};

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUserSelect,
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

const validateAndBuildUpdateData = (payload: UpdateMePayload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Request body must be a valid JSON object");
  }

  const allowedKeys = new Set(["name", "image"]);
  const payloadKeys = Object.keys(payload);
  const invalidKeys = payloadKeys.filter((key) => !allowedKeys.has(key));

  if (invalidKeys.length > 0) {
    throw new Error(`Invalid field(s): ${invalidKeys.join(", ")}. Only name and image are allowed`);
  }

  const data: { name?: string; image?: string | null } = {};

  if ("name" in payload) {
    if (typeof payload.name !== "string") {
      throw new Error("name must be a string");
    }

    const normalizedName = payload.name.trim();
    if (!normalizedName) {
      throw new Error("name cannot be empty");
    }

    data.name = normalizedName;
  }

  if ("image" in payload) {
    if (payload.image === null) {
      data.image = null;
    } else if (typeof payload.image === "string") {
      const normalizedImage = payload.image.trim();
      if (!normalizedImage) {
        throw new Error("image cannot be empty. Use null to remove image");
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(normalizedImage);
      } catch {
        throw new Error("image must be a valid URL or null");
      }

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("image URL must start with http:// or https://");
      }

      data.image = normalizedImage;
    } else {
      throw new Error("image must be a string URL or null");
    }
  }

  if (Object.keys(data).length === 0) {
    throw new Error("Provide at least one field to update: name or image");
  }

  return data;
};

const updateMe = async (userId: string, payload: UpdateMePayload) => {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!existingUser) {
    throw new Error("User not found");
  }

  const data = validateAndBuildUpdateData(payload);

  return prisma.user.update({
    where: { id: userId },
    data,
    select: publicUserSelect,
  });
};

export const authService = {
  getMe,
  updateMe,
};
