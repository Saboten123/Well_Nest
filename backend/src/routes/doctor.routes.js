import express from "express";
import { authRequired } from "../middlewares/auth.js";
import {
  upsertDoctorProfile,
  getMyDoctorProfile
} from "../controllers/doctor.controller.js";

const router = express.Router();

// Self profile (JWT required)
router.post("/profile", authRequired, upsertDoctorProfile); // create / update
router.get("/profile", authRequired, getMyDoctorProfile);   // read

export default router;
