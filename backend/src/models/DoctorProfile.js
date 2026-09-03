import mongoose from "mongoose";

const DoctorProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true },
    name: { type: String, default: null },
    specialization: { type: String, default: null },
    licenseNumber: { type: String, default: null },
    affiliation: { type: String, default: null },
    gender: { type: String, default: null },
    fee: { type: Number, default: null },
    availability: { type: Object, default: null }, // simple for now
    isProfileComplete: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("DoctorProfile", DoctorProfileSchema);
