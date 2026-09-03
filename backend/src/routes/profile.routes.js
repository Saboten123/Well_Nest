import { Router } from "express";
import { authRequired } from "../middlewares/auth.js";
import { getMyProfile, updateMyProfile } from "../controllers/profile.controller.js";

const router = Router();


router.get("/me", authRequired, getMyProfile);


router.patch("/:role", authRequired, updateMyProfile);

export default router;
