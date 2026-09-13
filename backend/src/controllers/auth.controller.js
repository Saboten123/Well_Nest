import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import NGOProfile from "../models/NGOProfile.js";
import DoctorProfile from "../models/DoctorProfile.js";
import HealthWorkerProfile from "../models/HealthWorkerProfile.js";
import PatientProfile from "../models/PatientProfile.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";
import { sendOtpEmail, sendPasswordResetOtpEmail } from "../utils/mailer.js";

function ok(res, message, data = {}) {
  return res.json({ success: true, message, data });
}
function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

const OTP_EXPIRES_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const SIGNUP_TOKEN_EXPIRES = "15m";

function generateOtpCode() {
  return crypto.randomInt(100000, 1000000).toString(); // 6-digit code
}

// Step 1: send a 6-digit OTP to the email the person wants to sign up with.
export async function sendSignupOtp(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return fail(res, 400, "Email is required");

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return fail(res, 409, "Email already registered");

    const code = generateOtpCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

    // Replace any previous pending OTP for this email/purpose.
    await Otp.findOneAndDelete({ email: normalizedEmail, purpose: "signup" });
    await Otp.create({ email: normalizedEmail, codeHash, purpose: "signup", expiresAt });

    await sendOtpEmail(normalizedEmail, code);

    return ok(res, "OTP sent to your email");
  } catch (err) {
    next(err);
  }
}

// Step 2: verify the OTP. On success, returns a short-lived signupToken
// that proves this email was verified; the real /signup call requires it.
export async function verifySignupOtp(req, res, next) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return fail(res, 400, "Email and OTP are required");

    const normalizedEmail = email.trim().toLowerCase();
    const record = await Otp.findOne({ email: normalizedEmail, purpose: "signup" });
    if (!record) return fail(res, 400, "No OTP requested for this email, or it already expired");

    if (record.expiresAt < new Date()) {
      await record.deleteOne();
      return fail(res, 400, "OTP expired, please request a new one");
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await record.deleteOne();
      return fail(res, 429, "Too many incorrect attempts, please request a new OTP");
    }

    const matches = await bcrypt.compare(String(otp), record.codeHash);
    if (!matches) {
      record.attempts += 1;
      await record.save();
      return fail(res, 400, "Incorrect OTP");
    }

    await record.deleteOne();

    const signupToken = jwt.sign(
      { email: normalizedEmail, purpose: "signup" },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: SIGNUP_TOKEN_EXPIRES }
    );

    return ok(res, "Email verified", { signupToken });
  } catch (err) {
    next(err);
  }
}

export async function signup(req, res, next) {
  try {
    const { email, password, firstName, lastName, role, phone, location, signupToken } = req.body;

    if (!email || !password || !firstName || !lastName || !role) {
      return fail(res, 400, "Missing required fields");
    }
    if (!signupToken) {
      return fail(res, 400, "Please verify your email with the OTP before signing up");
    }

    const normalizedEmail = email.trim().toLowerCase();

    let payload;
    try {
      payload = jwt.verify(signupToken, process.env.JWT_ACCESS_SECRET);
    } catch (e) {
      return fail(res, 400, "Email verification expired, please verify your email again");
    }
    if (payload.purpose !== "signup" || payload.email !== normalizedEmail) {
      return fail(res, 400, "Email verification does not match this email");
    }

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return fail(res, 409, "Email already registered");

    const user = await User.create({
      email: normalizedEmail,
      password,
      firstName,
      lastName,
      role,
      phone,
      location,
    });

    // Create empty role profile NOW (fields remain null)
    const link = { user: user._id };
    if (role === "ngo") await NGOProfile.create(link);
    if (role === "doctor") await DoctorProfile.create(link);
    if (role === "health_worker") await HealthWorkerProfile.create(link);
    if (role === "patient") await PatientProfile.create(link);

    const accessToken = signAccessToken({ id: user._id, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id, role: user.role });

    return ok(res, "Signup successful", {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      tokens: { accessToken, refreshToken }
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return fail(res, 401, "Invalid credentials");

    const okPw = await user.comparePassword(password);
    if (!okPw) return fail(res, 401, "Invalid credentials");

    const accessToken = signAccessToken({ id: user._id, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id, role: user.role });

    return ok(res, "Login successful", {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      tokens: { accessToken, refreshToken }
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return fail(res, 404, "User not found");
    return ok(res, "OK", { user });
  } catch (err) {
    next(err);
  }
}

// Step 1: send a 6-digit OTP to reset a forgotten password.
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return fail(res, 400, "Email is required");

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    // Don't reveal whether the email is registered.
    if (!user) return ok(res, "If that email is registered, a reset code has been sent");

    const code = generateOtpCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

    await Otp.findOneAndDelete({ email: normalizedEmail, purpose: "reset-password" });
    await Otp.create({ email: normalizedEmail, codeHash, purpose: "reset-password", expiresAt });

    await sendPasswordResetOtpEmail(normalizedEmail, code);

    return ok(res, "If that email is registered, a reset code has been sent");
  } catch (err) {
    next(err);
  }
}

// Step 2: verify the reset OTP. On success, returns a short-lived resetToken.
export async function verifyPasswordResetOtp(req, res, next) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return fail(res, 400, "Email and OTP are required");

    const normalizedEmail = email.trim().toLowerCase();
    const record = await Otp.findOne({ email: normalizedEmail, purpose: "reset-password" });
    if (!record) return fail(res, 400, "No reset code requested for this email, or it already expired");

    if (record.expiresAt < new Date()) {
      await record.deleteOne();
      return fail(res, 400, "Reset code expired, please request a new one");
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await record.deleteOne();
      return fail(res, 429, "Too many incorrect attempts, please request a new reset code");
    }

    const matches = await bcrypt.compare(String(otp), record.codeHash);
    if (!matches) {
      record.attempts += 1;
      await record.save();
      return fail(res, 400, "Incorrect reset code");
    }

    await record.deleteOne();

    const resetToken = jwt.sign(
      { email: normalizedEmail, purpose: "reset-password" },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: SIGNUP_TOKEN_EXPIRES }
    );

    return ok(res, "Code verified", { resetToken });
  } catch (err) {
    next(err);
  }
}

// Step 3: set the new password using the verified resetToken.
export async function resetPassword(req, res, next) {
  try {
    const { email, newPassword, resetToken } = req.body;
    if (!email || !newPassword || !resetToken) {
      return fail(res, 400, "Email, new password, and reset token are required");
    }
    if (newPassword.length < 6) {
      return fail(res, 400, "Password must be at least 6 characters");
    }

    const normalizedEmail = email.trim().toLowerCase();

    let payload;
    try {
      payload = jwt.verify(resetToken, process.env.JWT_ACCESS_SECRET);
    } catch (e) {
      return fail(res, 400, "Reset session expired, please verify the code again");
    }
    if (payload.purpose !== "reset-password" || payload.email !== normalizedEmail) {
      return fail(res, 400, "Reset session does not match this email");
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return fail(res, 404, "User not found");

    user.password = newPassword; // pre-save hook rehashes it
    await user.save();

    return ok(res, "Password reset successfully");
  } catch (err) {
    next(err);
  }
}