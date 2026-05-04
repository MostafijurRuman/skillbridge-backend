import { Router } from "express";
import { searchController } from "./search.controller";

export const searchRouter = Router();

searchRouter.get("/", searchController.globalSearch);
