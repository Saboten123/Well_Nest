import mongoose from "mongoose";

const AppointmentSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DoctorProfile",
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatientProfile",
      required: true,
    },
    requestedTime: {
      type: Date,
      required: true,
      unique: true,
    }, // when patient requests
    scheduledTime: {
      type: Date,
      unique: true,
    }, // doctor sets this when accepted
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "rejected",
        "scheduled",
        "ongoing",
        "ended",
        "cancelled",
      ],
      default: "pending",
    },
    reason: { type: String, default: null }, // patient’s reason
    notes: { type: String, default: null }, // doctor’s extra notes if any
  },
  { timestamps: true }
);

export default mongoose.model("Appointment", AppointmentSchema);
