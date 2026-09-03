const mongoose = require("mongoose");

const organiserSchema = new mongoose.Schema(
  {
    //this id will be fetched from girirajs db
    shortId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, required: true },
    eventType: {
      type: String,
      enum: [
        "Free Health CheckUp",
        "Vaccination Drive",
        "Blood Donation Camp",
        "Mobile Health Camp",
        "Nutrition & Diet Camps",
        "Other",
      ],
      required: true,
    },

    // If "Other" is chosen, store custom event name here
    customEventName: {
      type: String,
      required: function () {
        return this.eventType === "Other"; // ✅ only required when eventType = Other
      },
      trim: true,
    },

    location: { type: String, default: null },
    locationURL: { type: String, default: null },
    date: { type: Date, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    donationNeeded: { type: Boolean, default: false },
    upiId: {
      type: String,
      required: function () {
        return this.donationNeeded == true;
      },
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const ORG = mongoose.model("organiser", organiserSchema);

module.exports = ORG;
