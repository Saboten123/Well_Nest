import { Op } from "sequelize";
import DoctorProfile from "../models/DoctorProfile.js";
import User from "../models/User.js";
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

    const [profile] = await DoctorProfile.findOrCreate({
      where: { userId: req.user.id },
      defaults: { userId: req.user.id },
    });
    await profile.update({
      name: name ?? null,
      specialization: specialization ?? null,
      licenseNumber: licenseNumber ?? null,
      affiliation: affiliation ?? null,
      gender: gender ?? null,
      fee: fee ?? null,
      availability: availability ?? null,
      isProfileComplete: true
    });

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
    const profile = await DoctorProfile.findOne({
      where: { userId: req.user.id },
      include: [{ model: User, attributes: ["email", "firstName", "lastName", "role"] }],
    });

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
    const where = {};
    if (specialization) where.specialization = specialization;
    if (q) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${q}%` } },
        { affiliation: { [Op.iLike]: `%${q}%` } },
      ];
    }

    const doctors = await DoctorProfile.findAll({
      where,
      attributes: ["name", "specialization", "affiliation", "gender", "fee", "isProfileComplete"],
      include: [{ model: User, attributes: ["firstName", "lastName"] }],
    });

    return res.json({ success: true, data: doctors });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};