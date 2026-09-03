import mongoose from "mongoose";

const HealthWorkerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true },
    name: { type: String, default: null },
    employer: { type: String, default: null },
    certId: { type: String, default: null },
    region: { type: String, default: null },
    blogs: {
      type: [
        { title: String, body: String, createdAt: { type: Date, default: Date.now } }
      ],
      default: []
    },
    isProfileComplete: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("HealthWorkerProfile", HealthWorkerProfileSchema);
