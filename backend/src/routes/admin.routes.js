import express from "express";
import { authRequired } from "../middlewares/auth.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import {
    getAllUsers,
    getStats,
    deleteUser,
} from "../controllers/admin.controller.js";

const router = express.Router();

router.use(authRequired, requireAdmin);

router.get("/users", getAllUsers);
router.get("/stats", getStats);
router.delete("/users/:userId", deleteUser);

export default router;