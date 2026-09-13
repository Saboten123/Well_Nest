import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, lowercase: true, trim: true },
        codeHash: { type: String, required: true },
        purpose: { type: String, default: "signup" },
        attempts: { type: Number, default: 0 },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Otp", OtpSchema);