import { Request, Response } from "express";
import { adminService } from "./admin.service";

const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await adminService.getAllUsers();

    res.status(200).json({
      success: true,
      message: "All users retrieved successfully",
      data: users,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

const getAllBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await adminService.getAllBookings();

    res.status(200).json({
      success: true,
      message: "All bookings retrieved successfully",
      data: bookings,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
};

const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { isBanned } = req.body;

    if (typeof isBanned !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isBanned must be a boolean value",
      });
    }

    const user = await adminService.updateUserStatus(
      req.params.id as string,
      isBanned
    );

    res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: user,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update user status",
    });
  }
};

const getAllCategories = async (req: Request, res: Response) => {
  try {
    const categories = await adminService.getAllCategories();

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
};

export const adminController = {
  getUsers,
  getAllBookings,
  updateUserStatus,
  getAllCategories,
};
