import { Request, Response } from "express";
import { tutorService } from "./tutor.service";

const listTutors = async (req: Request, res: Response) => {
    try {
        const tutors = await tutorService.getTutors(req.query);
        res.status(200).json({ success: true, data: tutors });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const tutorDetails = async (req: Request, res: Response) => {
    try {
        const tutor = await tutorService.getTutorById(req.params.id as string);
        res.status(200).json({ success: true, data: tutor });
    } catch (error: any) {
        res.status(404).json({ success: false, message: error.message });
    }
};

const createTutorProfile = async (req: Request, res: Response) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ success: false, message: "Request body is missing or empty" });
        }
        const profile = await tutorService.createProfile(req.user!.id, req.body);
        res.status(201).json({ success: true, data: profile });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const updateTutorProfile = async (req: Request, res: Response) => {
    try {
        const profile = await tutorService.updateProfile(req.user!.id, req.body);
        res.status(200).json({ success: true, data: profile });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const setAvailability = async (req: Request, res: Response) => {
    try {
        const availability = await tutorService.setAvailability(req.user!.id, req.body);
        res.status(200).json({ success: true, data: availability });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getAvailability = async (req: Request, res: Response) => {
    try {
        const availability = await tutorService.getAvailability(req.user!.id);
        res.status(200).json({ success: true, data: availability });
    } catch (error: any) {
        res.status(404).json({ success: false, message: error.message });
    }
};

const getTutorDashboard = async (req: Request, res: Response) => {
    try {
        const dashboard = await tutorService.getTutorDashboard(req.user!.id);
        res.status(200).json({ success: true, data: dashboard });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const tutorController = {
    listTutors,
    tutorDetails,
    createTutorProfile,
    updateTutorProfile,
    setAvailability,
    getAvailability,
    getTutorDashboard,
};
