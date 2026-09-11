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
    }, // when patient requests
    scheduledTime: {
      type: Date,
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

// A doctor can't have two appointments requested for the exact same
// timestamp, but the same timestamp is fine across different doctors.
// (Previously `requestedTime` alone had a global unique index, so any two
// patients booking any doctor at the same instant would collide.)
AppointmentSchema.index({ doctorId: 1, requestedTime: 1 }, { unique: true });

export default mongoose.model("Appointment", AppointmentSchema);