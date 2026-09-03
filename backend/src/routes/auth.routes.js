import { Router } from "express";
import { body } from "express-validator";
import { signup, login, me } from "../controllers/auth.controller.js";
import { authRequired } from "../middlewares/auth.js";

const router = Router();

router.post(
  "/signup",
  [
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    body("firstName").notEmpty(),
    body("lastName").notEmpty(),
    body("role").isIn(["ngo", "doctor", "health_worker", "patient"])
  ],
  (req, res, next) => signup(req, res, next)
);

router.post("/login", [body("email").isEmail(), body("password").notEmpty()], login);

router.get("/me", authRequired, me);

export default router;
