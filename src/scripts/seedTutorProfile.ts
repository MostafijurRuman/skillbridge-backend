import { UserRole } from "../enums/role.enum";
import { prisma } from "../lib/prisma";

const categories = [
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Computer Science",
    "English Literature",
    "History",
    "Geography",
    "Music Theory",
    "Visual Arts"
];

const tutors = [
    {
        name: "John Doe",
        email: "john.doe@example.com",
        bio: "Experienced Mathematics tutor with over 5 years of teaching calculus and algebra. I make complex concepts easy to understand.",
        pricePerHr: 50,
        categories: ["Mathematics", "Physics"],
        availability: [
            { day: "Monday", startTime: "09:00", endTime: "12:00" },
            { day: "Wednesday", startTime: "14:00", endTime: "18:00" }
        ]
    },
    {
        name: "Jane Smith",
        email: "jane.smith@example.com",
        bio: "Passionate Biology and Chemistry tutor. I help students excel in their science exams through interactive learning.",
        pricePerHr: 60,
        categories: ["Biology", "Chemistry"],
        availability: [
            { day: "Tuesday", startTime: "10:00", endTime: "14:00" },
            { day: "Thursday", startTime: "10:00", endTime: "14:00" }
        ]
    },
    {
        name: "Alice Johnson",
        email: "alice.johnson@example.com",
        bio: "Computer Science expert specializing in web development and algorithms. Let's code your future together!",
        pricePerHr: 75,
        categories: ["Computer Science", "Mathematics"],
        availability: [
            { day: "Friday", startTime: "13:00", endTime: "17:00" },
            { day: "Saturday", startTime: "09:00", endTime: "13:00" }
        ]
    },
    {
        name: "Robert Brown",
        email: "robert.brown@example.com",
        bio: "English Literature enthusiast. I can help you analyze texts, improve your writing, and appreciate classic literature.",
        pricePerHr: 45,
        categories: ["English Literature", "History"],
        availability: [
            { day: "Monday", startTime: "16:00", endTime: "20:00" },
            { day: "Wednesday", startTime: "16:00", endTime: "20:00" }
        ]
    },
    {
        name: "Emily Davis",
        email: "emily.davis@example.com",
        bio: "Professional musician and theory tutor. I teach music theory, composition, and history.",
        pricePerHr: 55,
        categories: ["Music Theory", "Visual Arts"],
        availability: [
            { day: "Sunday", startTime: "10:00", endTime: "15:00" }
        ]
    }
];

function createDateTime(timeStr: string): Date {
    const [hours = 0, minutes = 0] = timeStr.split(":").map(Number);
    return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
}

async function seedTutorProfile() {
    try {
        console.log("***** Tutor Profile Seeding Started *****");

        // 1. Seed Categories
        console.log("--- Seeding Categories ---");
        const categoryMap = new Map<string, string>();

        for (const catName of categories) {
            const category = await prisma.category.upsert({
                where: { name: catName },
                update: {},
                create: { name: catName },
            });
            categoryMap.set(catName, category.id);
        }
        console.log(`Verified ${categories.length} Categories`);

        // 2. Seed Tutors
        console.log("--- Seeding Tutors ---");
        const password = "password123";

        for (const tutorData of tutors) {
            // Check if user exists
            let user = await prisma.user.findUnique({
                where: { email: tutorData.email },
            });

            if (!user) {
                // Create User via API
                console.log(`Registering user via API: ${tutorData.email}`);

                const apiUrl = `${process.env.API_URL || "http://localhost:5000"}/api/auth/sign-up/email`;

                try {
                    const signUpResponse = await fetch(apiUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Origin": "http://localhost:5000",
                        },
                        body: JSON.stringify({
                            name: tutorData.name,
                            email: tutorData.email,
                            password: password,
                            role: UserRole.TUTOR,
                        })
                    });

                    if (!signUpResponse.ok) {
                        const errorText = await signUpResponse.text();
                        console.error(`Failed to register ${tutorData.name} at ${apiUrl}: ${errorText}`);
                        continue;
                    }
                } catch (fetchError) {
                    console.error(`Fetch error for ${tutorData.email}:`, fetchError);
                    continue;
                }

                // Fetch the user that was just created
                user = await prisma.user.findUnique({
                    where: { email: tutorData.email }
                });

                if (user) {
                    // Verify and ensure Role
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            emailVerified: true,
                            role: UserRole.TUTOR
                        }
                    });
                    console.log(`Created and Verified User: ${tutorData.name}`);
                }
            } else {
                console.log(`User already exists: ${tutorData.name}`);
                // Ensure role is TUTOR
                if (user.role !== UserRole.TUTOR) {
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: { role: UserRole.TUTOR }
                    });
                    console.log(`Updated role to TUTOR for: ${tutorData.name}`);
                }
            }

            if (!user) {
                console.error(`Could not find user for ${tutorData.email} after attempts. Skipping.`);
                continue;
            }

            // Create or Update Tutor Profile
            const existingProfile = await prisma.tutorProfile.findUnique({
                where: { userId: user.id },
            });

            if (!existingProfile) {
                // Connect categories
                const categoryIds = tutorData.categories
                    .map((c) => categoryMap.get(c))
                    .filter((id): id is string => !!id);

                const profile = await prisma.tutorProfile.create({
                    data: {
                        userId: user.id,
                        bio: tutorData.bio,
                        pricePerHr: tutorData.pricePerHr,
                        categories: {
                            connect: categoryIds.map((id) => ({ id })),
                        },
                    },
                });
                console.log(`Created Tutor Profile for: ${tutorData.name}`);

                // Create Availability
                if (tutorData.availability.length > 0) {
                    await prisma.availability.createMany({
                        data: tutorData.availability.map((slot) => ({
                            tutorId: profile.id,
                            day: slot.day,
                            startTime: createDateTime(slot.startTime),
                            endTime: createDateTime(slot.endTime)
                        }))
                    });
                    console.log(`Created Availability for: ${tutorData.name}`);
                }

            } else {
                console.log(`Tutor Profile already exists for: ${tutorData.name}`);
            }
        }

        console.log("***** Tutor Profile Seeding Completed Successfully *****");
    } catch (error) {
        console.error("Error seeding tutor profiles:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

seedTutorProfile();
