const express = require("express");
const ORG = require("../model/campOrganisers.js");
const PCT = require("../model/participants.js");

const { authMiddleware, restrictRole } = require("../middlewares/auth.js"); // your new auth middleware

const router = express.Router();
router.use(authMiddleware);
router.post(
  "/set",
  restrictRole(["ngo", "health_worker"]),
  async (req, res) => {
    const {
      location,
      locationURL,
      date, // e.g. "2025-08-20"
      startTime, // e.g. "09:00"
      endTime, // e.g. "13:00"
      eventType,
      customEventName,
      donationNeeded,
      upiId,
    } = req.body;

    if (
      !req.user ||
      !req.user.email ||
      !req.user.firstName ||
      !req.user.lastName ||
      !req.user.role ||
      !location ||
      !locationURL ||
      !date ||
      !startTime ||
      !endTime ||
      !eventType ||
      !donationNeeded ||
      (eventType === "Other" && !customEventName) ||
      (donationNeeded == true && !upiId)
    ) {
      return res
        .status(400)
        .json({ error: "All required fields must be provided" });
    }

    try {
      // Convert to Date objects
      // const startDateTime = new Date(`${date}T${startTime}`);
      // const endDateTime = new Date(`${date}T${endTime}`);

      if (endTime <= startTime) {
        return res.status(400).json({
          error: "End time must be greater than start time",
        });
      }

      // Check for overlapping events for this organiser
      const conflict = await ORG.findOne({
        shortId: req.user._id.toString(),
        $and: [
          {
            startTime: { $lt: endTime },
            endTime: { $gt: startTime },
          },
        ],
      });

      if (conflict) {
        return res.status(400).json({
          error:
            "An event organised by you already exists in the selected time range.",
        });
      }

      // Create a new event
      const newEvent = await ORG.create({
        shortId: req.user._id.toString(),
        name: req.user.firstName + " " + req.user.lastName,
        email: req.user.email,
        role: req.user.role,
        location,
        locationURL,
        date: date,
        startTime: startTime,
        endTime: endTime,
        eventType,
        donationNeeded,
        upiId: donationNeeded == true ? upiId : null,
        customEventName: eventType === "Other" ? customEventName : null,
      });

      res.status(201).json({ success: true, event: newEvent });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.patch(
  "/delete/:eventId",
  restrictRole(["ngo", "health_worker"]),
  async (req, res) => {
    if (!req.user || !req.user._id) {
      return res.status(400).json({ error: "ALL flags are required" });
    }
    const { eventId } = req.params;
    if (!eventId) return res.status(400).json({ error: "eventId required" });

    console.log("Delete Called");
    try {
      // Delete the organiser's event
      const deletedOrg = await ORG.findOneAndDelete({
        _id: eventId,
      });

      if (!deletedOrg) {
        return res.status(404).json({ error: "Organiser not found" });
      }

      //  Cascade delete all participants of this event
      await PCT.deleteMany({ eventId: deletedOrg._id });

      res.status(200).json({
        success: true,
        message: "Event and all related participants deleted successfully",
        deletedOrg,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get("/all", async (req, res) => {
  try {
    const orgs = await ORG.find(); // fetch ALL organisers/events
    res.status(200).json({ success: true, orgs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
