import mongoose from "mongoose";

const NGOProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true },
    orgName: { type: String, default: null },
    registrationNumber: { type: String, default: null },
    mission: { type: String, default: null },
    website: { type: String, default: null },
    email: { type: String, default: null },
    services: { type: [String], default: null }, // Array of services provided by the NGO
    blogs: {
      type: [
        {
          title: String,
          body: String,
          createdAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    },
    isProfileComplete: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("NGOProfile", NGOProfileSchema);
