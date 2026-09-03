import NGOProfile from "../models/NGOProfile.js";
import DoctorProfile from "../models/DoctorProfile.js";

function ok(res, message, data = {}) {
  return res.json({ success: true, message, data });
}

export async function listNGOs(req, res, next) {
  try {
    const ngos = await NGOProfile.find({}, { blogs: 0 }).populate("user", "firstName lastName");
    return ok(res, "OK", { items: ngos });
  } catch (err) {
    next(err);
  }
}

export async function listDoctors(req, res, next) {
  try {
    // Optional simple filters
    const { specialization, gender, q } = req.query;
    const filter = {};
    if (specialization) filter.specialization = specialization;
    if (gender) filter.gender = gender;
    if (q) filter.$or = [{ name: new RegExp(q, "i") }, { affiliation: new RegExp(q, "i") }];

    const doctors = await DoctorProfile.find(filter).populate("user", "firstName lastName");
    return ok(res, "OK", { items: doctors });
  } catch (err) {
    next(err);
  }
}
