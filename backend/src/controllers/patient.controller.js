import PatientProfile from "../models/PatientProfile.js";

// POST or PUT /patient/profile → create or update
export const upsertPatientProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id; // from auth middleware

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const [profile] = await PatientProfile.findOrCreate({
      where: { userId },
      defaults: { userId },
    });
    await profile.update({ name, isProfileComplete: true });

    return res.status(200).json({
      message: "Patient profile saved successfully",
      profile
    });
  } catch (err) {
    console.error("Error saving patient profile:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /patient/profile → get my profile
export const getMyPatientProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await PatientProfile.findOne({ where: { userId } });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    return res.status(200).json({ profile });
  } catch (err) {
    console.error("Error fetching patient profile:", err);
    return res.status(500).json({ message: "Server error" });
  }
};