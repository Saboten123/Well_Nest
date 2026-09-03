import express from "express";
import { upsertPatientProfile, getMyPatientProfile } from "../controllers/patient.controller.js";
import { authRequired } from "../middlewares/auth.js";

const router = express.Router();

// Create or update profile
router.post("/profile", authRequired, upsertPatientProfile);

// Get my profile
router.get("/profile", authRequired, getMyPatientProfile);

export default router;
