import { Router } from "express";
import { body } from "express-validator";
import {
  signup,
  login,
  me,
  sendSignupOtp,
  verifySignupOtp,
} from "../controllers/auth.controller.js";
import { authRequired } from "../middlewares/auth.js";

const router = Router();

router.post("/otp/send", [body("email").isEmail()], sendSignupOtp);

router.post(
  "/otp/verify",
  [body("email").isEmail(), body("otp").isLength({ min: 6, max: 6 })],
  verifySignupOtp
);

router.post(
  "/signup",
  [
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    body("firstName").notEmpty(),
    body("lastName").notEmpty(),
    body("role").isIn(["ngo", "doctor", "health_worker", "patient"]),
    body("signupToken").notEmpty(),
  ],
  (req, res, next) => signup(req, res, next)
);

router.post("/login", [body("email").isEmail(), body("password").notEmpty()], login);

router.get("/me", authRequired, me);

export default router;