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
    if (!Model) return fail(res, 400, "Unknown role");

    // Auto-create an empty profile if one doesn't exist yet, instead of
    // failing with 404 (e.g. older accounts created before signup started
    // creating a profile automatically).
    const [profile] = await Model.findOrCreate({
      where: { userId: req.user.id },
      defaults: { userId: req.user.id },
    });
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
    if (!Model) return fail(res, 400, "Unknown role");

    const [profile] = await Model.findOrCreate({
      where: { userId: req.user.id },
      defaults: { userId: req.user.id },
    });
    await profile.update({ ...req.body });

    return ok(res, "Profile updated", { profile });
  } catch (err) {
    next(err);
  }
}