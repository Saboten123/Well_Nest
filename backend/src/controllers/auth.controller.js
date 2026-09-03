import User from "../models/User.js";
import NGOProfile from "../models/NGOProfile.js";
import DoctorProfile from "../models/DoctorProfile.js";
import HealthWorkerProfile from "../models/HealthWorkerProfile.js";
import PatientProfile from "../models/PatientProfile.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";

function ok(res, message, data = {}) {
  return res.json({ success: true, message, data });
}
function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

export async function signup(req, res, next) {
  try {
    const { email, password, firstName, lastName, role, phone, location } = req.body;

    if (!email || !password || !firstName || !lastName || !role) {
      return fail(res, 400, "Missing required fields");
    }

    const exists = await User.findOne({ email });
    if (exists) return fail(res, 409, "Email already registered");

    const user = await User.create({ email, password, firstName, lastName, role, phone, location });

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
    const user = await User.findOne({ email });
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
