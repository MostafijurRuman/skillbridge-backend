import express, { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { UserRole } from "../../enums/role.enum";
import authChecker from "../../middlewares/authChecker";

const router = express.Router();

// Get all categories (Admin only)
router.get("/categories", authChecker(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany();

    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data: categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
});

export const categoryRouter: Router = router;
