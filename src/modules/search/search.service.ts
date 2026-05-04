import { prisma } from "../../lib/prisma";

export const searchService = {
    performSearch: async (query: string) => {
        const searchKeyword = query.toLowerCase().trim();

        // 1. Search Categories
        const categories = await prisma.category.findMany({
            where: {
                name: {
                    contains: searchKeyword,
                    mode: "insensitive",
                },
            },
            take: 5,
        });

        // 2. Search Tutors
        const tutors = await prisma.tutorProfile.findMany({
            where: {
                user: {
                    name: {
                        contains: searchKeyword,
                        mode: "insensitive",
                    },
                    role: "TUTOR",
                },
            },
            include: {
                user: {
                    select: {
                        name: true,
                        image: true,
                    },
                },
            },
            take: 5,
        });

        // Map tutors to a cleaner format
        const formattedTutors = tutors.map((tutor: any) => ({
            id: tutor.id,
            name: tutor.user.name,
            image: tutor.user.image,
            rating: tutor.rating,
        }));

        // 3. Search Subjects (Mapped from Categories)
        const subjects = categories.map((cat: any) => ({ id: cat.id, name: cat.name }));

        return {
            subjects,
            tutors: formattedTutors,
            categories: categories.map((cat: any) => ({ id: cat.id, name: cat.name })),
        };
    },
};
