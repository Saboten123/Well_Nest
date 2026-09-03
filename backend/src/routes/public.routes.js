import { Router } from "express";
import { listDoctors, listNGOs } from "../controllers/public.controller.js";

const router = Router();

router.get("/doctors", listDoctors);
router.get("/ngos", listNGOs);

export default router;
