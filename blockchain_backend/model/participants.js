const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ORG",
    required: true,
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  verified: {
    type: Boolean,
    default: false,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    match: [/^\+?[0-9]{10,15}$/, "Please enter a valid phone number"],
  },
  medicalConditions: {
    type: String,
    required: true,
    default: "None",
  },
  bloodType: {
    type: String,
    required: true,
    enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    default: "B+",
  },
  age: {
    type: Number,
    required: true,
    default: 0,
  },
  registeredAt: {
    type: Date,
    default: Date.now,
  },
});

const PCT = mongoose.model("participant", participantSchema);

module.exports = PCT;
