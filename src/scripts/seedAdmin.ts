import { UserRole } from "../enums/role.enum";
import { prisma } from "../lib/prisma";


async function seedAdmin() {
    try {
        console.log("***** Admin seeding started");
        const adminData = {
            name: "Admin",
            email: "admin@skillbridge.com",
            password: "admin1234",
            role: UserRole.ADMIN,
        }
        console.log("***** Checking Admin Exist or not");
        // check user exist on db or not
        const existingUser = await prisma.user.findUnique({
            where: {
                email: adminData.email
            }
        });

        if (existingUser) {
            throw new Error("User already exits!!");
        }

        const signUpAdmin = await fetch(`${process.env.API_URL || "http://localhost:5000"}/api/auth/sign-up/email`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Origin": "http://localhost:5000",
            },
            body: JSON.stringify(adminData)
        })


        if (signUpAdmin.ok) {
            console.log("***** Admin created");
            await prisma.user.update({
                where: {
                    email: adminData.email
                },
                data: {
                    emailVerified: true
                }
            })
            console.log("***** Email verification status updated!");
        }
        console.log("***** Success *****");

    } catch (error) {
        console.error(error);
    }
}

seedAdmin();