import { prisma } from "../../lib/prisma";

const WEEK_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

type WeekDay = (typeof WEEK_DAYS)[number];

type AvailabilityRecord = {
  id: string;
  tutorId?: string;
  day: string;
  startTime: Date;
  endTime: Date;
};

type AvailabilityInput = {
  day: unknown;
  startTime: unknown;
  endTime: unknown;
};

type UpdateAvailabilityPayload = {
  day?: unknown;
  startTime?: unknown;
  endTime?: unknown;
};

const dayLookup = WEEK_DAYS.reduce<Record<string, WeekDay>>((acc, day) => {
  acc[day.toLowerCase()] = day;
  return acc;
}, {});

const normalizeDayKey = (day: string) => day.trim().toLowerCase().replace(/[_\s-]/g, "");

const normalizeDay = (dayValue: unknown): WeekDay => {
  if (typeof dayValue !== "string") {
    throw new Error("Availability day must be a string");
  }

  const normalized = dayLookup[normalizeDayKey(dayValue)];

  if (!normalized) {
    throw new Error("Invalid day. Use full day names like Monday or Tuesday.");
  }

  return normalized;
};

const parseTimeValue = (value: unknown, field: "startTime" | "endTime"): Date => {
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string in HH:mm format`);
  }

  const raw = value.trim();
  const hhmmMatch = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);

  if (hhmmMatch) {
    const hours = Number(hhmmMatch[1]);
    const minutes = Number(hhmmMatch[2]);
    return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    // Backward compatibility for old ISO datetime payloads.
    return new Date(Date.UTC(1970, 0, 1, parsed.getUTCHours(), parsed.getUTCMinutes(), 0, 0));
  }

  throw new Error(`${field} must be in HH:mm format`);
};

const getMinutes = (date: Date) => date.getUTCHours() * 60 + date.getUTCMinutes();

const getMinuteRange = (slot: { startTime: Date; endTime: Date }) => {
  const start = getMinutes(slot.startTime);
  let end = getMinutes(slot.endTime);

  if (end === 0 && start > 0) {
    end = 1440;
  }

  return { start, end };
};

const toHHMM = (date: Date) => {
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const normalizeResponseDay = (day: string) => {
  const normalized = dayLookup[normalizeDayKey(day)];
  return normalized ?? day;
};

const sortAvailability = <T extends { day: string; startTime: Date }>(slots: T[]) => {
  return [...slots].sort((a, b) => {
    const aDay = WEEK_DAYS.indexOf(normalizeResponseDay(a.day) as WeekDay);
    const bDay = WEEK_DAYS.indexOf(normalizeResponseDay(b.day) as WeekDay);

    if (aDay !== bDay) {
      if (aDay === -1) return 1;
      if (bDay === -1) return -1;
      return aDay - bDay;
    }

    return getMinutes(a.startTime) - getMinutes(b.startTime);
  });
};

const formatAvailability = (slots: AvailabilityRecord[]) => {
  return sortAvailability(slots).map((slot) => ({
    id: slot.id,
    tutorId: slot.tutorId,
    day: normalizeResponseDay(slot.day),
    startTime: toHHMM(slot.startTime),
    endTime: toHHMM(slot.endTime),
  }));
};

const normalizeSlotsInput = (
  input: unknown
): { day: WeekDay; startTime: Date; endTime: Date }[] => {
  const rawSlots = Array.isArray(input)
    ? input
    : input && typeof input === "object"
      ? [input]
      : null;

  if (!rawSlots) {
    throw new Error("Availability payload must be an object or an array of objects");
  }

  const normalizedSlots = rawSlots.map((slot, index) => {
    if (!slot || typeof slot !== "object") {
      throw new Error(`Invalid availability slot at index ${index}`);
    }

    const payload = slot as AvailabilityInput;

    const normalized = {
      day: normalizeDay(payload.day),
      startTime: parseTimeValue(payload.startTime, "startTime"),
      endTime: parseTimeValue(payload.endTime, "endTime"),
    };

    const { start, end } = getMinuteRange(normalized);
    if (start >= end) {
      throw new Error(`Invalid time range for ${normalized.day}. endTime must be after startTime.`);
    }

    return normalized;
  });

  const slotsByDay = new Map<WeekDay, { start: number; end: number }[]>();
  for (const slot of normalizedSlots) {
    const bucket = slotsByDay.get(slot.day) ?? [];
    bucket.push(getMinuteRange(slot));
    slotsByDay.set(slot.day, bucket);
  }

  for (const [day, slots] of slotsByDay.entries()) {
    const sorted = [...slots].sort((a, b) => a.start - b.start);
    for (let index = 1; index < sorted.length; index += 1) {
      const current = sorted[index];
      const previous = sorted[index - 1];

      if (!current || !previous) {
        continue;
      }

      const isDuplicate = current.start === previous.start && current.end === previous.end;
      if (isDuplicate) {
        continue;
      }

      if (current.start < previous.end) {
        throw new Error(`Overlapping availability slots found for ${day}`);
      }
    }
  }

  return normalizedSlots;
};

const getTutorProfileOrThrow = async (userId: string) => {
  const tutor = await prisma.tutorProfile.findUnique({
    where: { userId },
  });

  if (!tutor) {
    throw new Error("Tutor profile not found");
  }

  return tutor;
};

const ensureValidAvailabilityUpdatePayload = (payload: unknown): UpdateAvailabilityPayload => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Request body must be a valid JSON object");
  }

  const raw = payload as Record<string, unknown>;
  const allowedFields = new Set(["day", "startTime", "endTime"]);
  const invalidFields = Object.keys(raw).filter((key) => !allowedFields.has(key));

  if (invalidFields.length > 0) {
    throw new Error(
      `Invalid field(s): ${invalidFields.join(", ")}. Only day, startTime and endTime are allowed`
    );
  }

  if (raw.day === undefined && raw.startTime === undefined && raw.endTime === undefined) {
    throw new Error("Provide at least one field to update: day, startTime, or endTime");
  }

  return {
    day: raw.day,
    startTime: raw.startTime,
    endTime: raw.endTime,
  };
};

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
  }).then((tutor) => {
    if (!tutor) {
      return tutor;
    }

    return {
      ...tutor,
      availability: formatAvailability(tutor.availability as AvailabilityRecord[]),
    };
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

const setAvailability = async (userId: string, slots: unknown) => {
  const tutor = await getTutorProfileOrThrow(userId);

  const normalizedSlots = normalizeSlotsInput(slots);

  if (normalizedSlots.length === 0) {
    return { count: 0 };
  }

  const existingSlots = await prisma.availability.findMany({
    where: { tutorId: tutor.id },
  });

  const existingByDay = new Map<WeekDay, { start: number; end: number }[]>();
  for (const slot of existingSlots) {
    const day = normalizeDay(slot.day);
    const bucket = existingByDay.get(day) ?? [];
    bucket.push(getMinuteRange(slot));
    existingByDay.set(day, bucket);
  }

  const slotsToCreate: { tutorId: string; day: WeekDay; startTime: Date; endTime: Date }[] = [];

  for (const slot of normalizedSlots) {
    const candidateRange = getMinuteRange(slot);
    const daySlots = existingByDay.get(slot.day) ?? [];

    const isDuplicate = daySlots.some(
      (existing) =>
        existing.start === candidateRange.start && existing.end === candidateRange.end
    );

    if (isDuplicate) {
      continue;
    }

    const hasOverlap = daySlots.some(
      (existing) =>
        candidateRange.start < existing.end && candidateRange.end > existing.start
    );

    if (hasOverlap) {
      throw new Error(
        `Overlapping availability with existing slot found for ${slot.day}`
      );
    }

    slotsToCreate.push({
      tutorId: tutor.id,
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });

    daySlots.push(candidateRange);
    existingByDay.set(slot.day, daySlots);
  }

  if (slotsToCreate.length === 0) {
    return { count: 0 };
  }

  return prisma.availability.createMany({
    data: slotsToCreate,
  });
};

const getAvailability = async (userId: string) => {
  const tutor = await getTutorProfileOrThrow(userId);

  const availability = await prisma.availability.findMany({
    where: { tutorId: tutor.id },
    orderBy: [
      { day: "asc" },
      { startTime: "asc" },
    ],
  });

  return formatAvailability(availability as AvailabilityRecord[]);
};

const updateAvailability = async (
  userId: string,
  availabilityId: string,
  payload: unknown
) => {
  const tutor = await getTutorProfileOrThrow(userId);
  const data = ensureValidAvailabilityUpdatePayload(payload);

  const existingSlot = await prisma.availability.findFirst({
    where: {
      id: availabilityId,
      tutorId: tutor.id,
    },
  });

  if (!existingSlot) {
    throw new Error("Availability slot not found");
  }

  const normalizedDay = data.day !== undefined ? normalizeDay(data.day) : normalizeDay(existingSlot.day);
  const startTime =
    data.startTime !== undefined ? parseTimeValue(data.startTime, "startTime") : existingSlot.startTime;
  const endTime = data.endTime !== undefined ? parseTimeValue(data.endTime, "endTime") : existingSlot.endTime;

  const nextSlot = {
    day: normalizedDay,
    startTime,
    endTime,
  };

  const range = getMinuteRange(nextSlot);
  if (range.start >= range.end) {
    throw new Error(`Invalid time range for ${normalizedDay}. endTime must be after startTime.`);
  }

  const sameDayOtherSlots = await prisma.availability.findMany({
    where: {
      tutorId: tutor.id,
      id: { not: availabilityId },
      day: {
        equals: normalizedDay,
        mode: "insensitive",
      },
    },
  });

  const hasOverlap = sameDayOtherSlots.some((slot) => {
    const slotRange = getMinuteRange(slot);
    return range.start < slotRange.end && range.end > slotRange.start;
  });

  if (hasOverlap) {
    throw new Error(`Overlapping availability with existing slot found for ${normalizedDay}`);
  }

  const updated = await prisma.availability.update({
    where: { id: availabilityId },
    data: nextSlot,
  });

  return formatAvailability([updated as AvailabilityRecord])[0];
};

const removeAvailability = async (userId: string, availabilityId: string) => {
  const tutor = await getTutorProfileOrThrow(userId);

  const existingSlot = await prisma.availability.findFirst({
    where: {
      id: availabilityId,
      tutorId: tutor.id,
    },
  });

  if (!existingSlot) {
    throw new Error("Availability slot not found");
  }

  const removed = await prisma.availability.delete({
    where: { id: availabilityId },
  });

  return formatAvailability([removed as AvailabilityRecord])[0];
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
  }).then((dashboard) => {
    if (!dashboard) {
      return dashboard;
    }

    return {
      ...dashboard,
      availability: formatAvailability(dashboard.availability as AvailabilityRecord[]),
    };
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
  updateAvailability,
  removeAvailability,
  getTutorDashboard,
};
