import { Request, Response } from "express";
import { searchService } from "./search.service";

const globalSearch = async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string;
        
        if (!query || query.trim() === "") {
            return res.status(200).json({
                subjects: [],
                tutors: [],
                categories: []
            });
        }

        const results = await searchService.performSearch(query);

        res.status(200).json(results);
    } catch (error) {
        console.error("Search Error:", error);
        res.status(500).json({
            message: "Failed to perform search",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

export const searchController = {
    globalSearch,
};
