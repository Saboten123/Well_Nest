import { Op } from "sequelize";
import NGOProfile from "../models/NGOProfile.js";
import DoctorProfile from "../models/DoctorProfile.js";
import User from "../models/User.js";

function ok(res, message, data = {}) {
  return res.json({ success: true, message, data });
}

export async function listNGOs(req, res, next) {
  try {
    const ngos = await NGOProfile.findAll({
      attributes: { exclude: ["blogs"] },
      include: [{ model: User, attributes: ["firstName", "lastName"] }],
    });
    return ok(res, "OK", { items: ngos });
  } catch (err) {
    next(err);
  }
}

export async function listDoctors(req, res, next) {
  try {
    // Optional simple filters
    const { specialization, gender, q } = req.query;
    const where = {};
    if (specialization) where.specialization = specialization;
    if (gender) where.gender = gender;
    if (q) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${q}%` } },
        { affiliation: { [Op.iLike]: `%${q}%` } },
      ];
    }

    const doctors = await DoctorProfile.findAll({
      where,
      include: [{ model: User, attributes: ["firstName", "lastName"] }],
    });
    return ok(res, "OK", { items: doctors });
  } catch (err) {
    next(err);
  }
}