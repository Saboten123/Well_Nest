import { Router } from "express";
import { body } from "express-validator";
import {
  signup,
  login,
  me,
  sendSignupOtp,
  verifySignupOtp,
  forgotPassword,
  verifyPasswordResetOtp,
  resetPassword,
} from "../controllers/auth.controller.js";
import { authRequired } from "../middlewares/auth.js";

const router = Router();

// Step 1: request an OTP be emailed to the address before signing up.
router.post("/otp/send", [body("email").isEmail()], sendSignupOtp);

// Step 2: verify the OTP; returns a short-lived signupToken on success.
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

// Forgot password flow
router.post("/forgot-password", [body("email").isEmail()], forgotPassword);

router.post(
  "/forgot-password/verify",
  [body("email").isEmail(), body("otp").isLength({ min: 6, max: 6 })],
  verifyPasswordResetOtp
);

router.post(
  "/reset-password",
  [
    body("email").isEmail(),
    body("newPassword").isLength({ min: 6 }),
    body("resetToken").notEmpty(),
  ],
  resetPassword
);

export default router;