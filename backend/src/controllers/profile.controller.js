import NGOProfile from "../models/NGOProfile.js";
import DoctorProfile from "../models/DoctorProfile.js";
import HealthWorkerProfile from "../models/HealthWorkerProfile.js";
import PatientProfile from "../models/PatientProfile.js";

function ok(res, message, data = {}) {
  return res.json({ success: true, message, data });
}
function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

const table = {
  ngo: NGOProfile,
  doctor: DoctorProfile,
  health_worker: HealthWorkerProfile,
  patient: PatientProfile
};

export async function getMyProfile(req, res, next) {
  try {
    const Model = table[req.user.role];
    const profile = await Model.findOne({ user: req.user.id });
    if (!profile) return fail(res, 404, "Profile not found");
    return ok(res, "OK", { profile });
  } catch (err) {
    next(err);
  }
}

export async function updateMyProfile(req, res, next) {
  try {
    const role = req.params.role; // ngo | doctor | health_worker | patient
    if (role !== req.user.role) return fail(res, 403, "Cannot edit other role profile");

    const Model = table[role];
    const profile = await Model.findOneAndUpdate(
      { user: req.user.id },
      { $set: { ...req.body } },
      { new: true, upsert: false }
    );

    return ok(res, "Profile updated", { profile });
  } catch (err) {
    next(err);
  }
}
