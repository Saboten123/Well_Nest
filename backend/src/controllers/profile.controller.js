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

// Fields that must be filled in for a role's profile to count as complete.
// (Mirrors the required fields already used by the per-role upsert
// controllers — e.g. upsertPatientProfile requires `name` — but those
// controllers aren't actually called by the profile-edit UI, so
// isProfileComplete was never getting set there.)
const REQUIRED_FIELDS = {
  ngo: ["orgName", "registrationNumber"],
  doctor: ["name", "specialization", "licenseNumber"],
  health_worker: ["name", "employer", "certId"],
  patient: ["name"],
};

function computeIsProfileComplete(role, mergedFields) {
  const required = REQUIRED_FIELDS[role] || [];
  return required.every((field) => {
    const value = mergedFields[field];
    return value !== null && value !== undefined && String(value).trim() !== "";
  });
}

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

    // The frontend seeds its edit form with the full document it got back
    // from GET /profile/me (including _id, user, __v, timestamps,
    // isProfileComplete) and PATCHes the whole thing back. None of those
    // are user-editable — in particular, MongoDB rejects any $set that
    // even mentions the immutable _id field. Strip everything except the
    // fields the role's schema actually exposes for editing.
    const NON_EDITABLE_FIELDS = new Set([
      "_id",
      "user",
      "__v",
      "createdAt",
      "updatedAt",
      "isProfileComplete",
    ]);
    const updates = {};
    for (const [key, value] of Object.entries(req.body || {})) {
      if (!NON_EDITABLE_FIELDS.has(key)) updates[key] = value;
    }

    // Some accounts never got their role profile auto-created at signup
    // (or it was removed), so `existing` may legitimately be null here.
    // Filling in your profile for the first time should create it, not
    // fail with "Profile not found" — hence upsert: true below.
    const existing = await Model.findOne({ user: req.user.id });
    const merged = { ...(existing ? existing.toObject() : {}), ...updates };
    const isProfileComplete = computeIsProfileComplete(role, merged);

    const profile = await Model.findOneAndUpdate(
      { user: req.user.id },
      {
        $set: { ...updates, isProfileComplete },
        $setOnInsert: { user: req.user.id },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return ok(res, "Profile updated", { profile });
  } catch (err) {
    next(err);
  }
}