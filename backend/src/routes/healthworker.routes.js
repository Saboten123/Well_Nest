import express from "express";
import { authRequired } from "../middlewares/auth.js";
import {
  upsertHealthWorkerProfile,
  getMyHealthWorkerProfile,
  addBlog,
  getMyBlogs,
  listHealthWorkersPublic,
  getAllHealthWorkerBlogs
} from "../controllers/healthworker.controller.js";

const router = express.Router();

//update and fetch the rest of the profile
router.post("/profile", authRequired, upsertHealthWorkerProfile);
router.get("/profile", authRequired, getMyHealthWorkerProfile);

//blogs for health worker (create + list own)
router.post("/blogs", authRequired, addBlog);
router.get("/blogs", authRequired, getMyBlogs);

// Public listing endpoint (optional here or add into public.routes.js)
// If you prefer public routes in public.routes.js, remove this line and
// add: router.get('/healthworkers', listHealthWorkersPublic) inside that file.
router.get("/list", listHealthWorkersPublic); // -> GET /healthworker/list

// Public endpoint to get all health worker blogs
router.get("/all-blogs", getAllHealthWorkerBlogs); // -> GET /healthworker/all-blogs

export default router;
