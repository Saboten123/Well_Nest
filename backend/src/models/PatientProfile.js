import mongoose from "mongoose";

const PatientProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true },
    name: { type: String, default: null },
    isProfileComplete: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("PatientProfile", PatientProfileSchema);
