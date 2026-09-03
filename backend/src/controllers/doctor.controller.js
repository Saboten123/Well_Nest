import DoctorProfile from "../models/DoctorProfile.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";
/**
 * Create or update doctor profile for logged-in user
 */
export const upsertDoctorProfile = async (req, res) => {
  try {
    const {
      name,
      specialization,
      licenseNumber,
      affiliation,
      gender,
      fee,
      availability
    } = req.body;

    const profile = await DoctorProfile.findOneAndUpdate(
      { user: req.user.id },
      {
        name: name ?? null,
        specialization: specialization ?? null,
        licenseNumber: licenseNumber ?? null,
        affiliation: affiliation ?? null,
        gender: gender ?? null,
        fee: fee ?? null,
        availability: availability ?? null,
        isProfileComplete: true
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, data: profile });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get doctor's own profile (requires JWT)
 */
export const getMyDoctorProfile = async (req, res) => {
  try {
    const profile = await DoctorProfile
      .findOne({ user: req.user.id })
      .populate("user", "email firstName lastName role");

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    return res.json({ success: true, data: profile });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Public listing of doctors for navbar / search page (no auth)
 * Optional query params: specialization, q (search by name/affiliation)
 */
export const listDoctorsPublic = async (req, res) => {
  try {
    const { specialization, q } = req.query;
    const filter = {};
    if (specialization) filter.specialization = specialization;
    if (q) filter.$or = [
      { name: new RegExp(q, "i") },
      { affiliation: new RegExp(q, "i") }
    ];

    const doctors = await DoctorProfile.find(filter, {
      name: 1,
      specialization: 1,
      affiliation: 1,
      gender: 1,
      fee: 1,
      isProfileComplete: 1
    }).populate("user", "firstName lastName");

    return res.json({ success: true, data: doctors });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
