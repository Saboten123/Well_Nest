const express = require("express");

const PCT = require("../model/participants.js");
const DNT = require("../model/Donaters.js");
const ORG = require("../model/campOrganisers.js");

const { authMiddleware } = require("../middlewares/auth.js");
const { setUserReward } = require("../contractService/Token_contract.js");

const router = express.Router();

// REGISTER PARTICIPANT
router.post("/register", authMiddleware, async (req, res) => {
  console.log("register called");
  const { eventId, participantDetails } = req.body;
  if (!eventId) return res.status(400).json({ error: "eventId required" });
  if (!participantDetails)
    return res.status(400).json({ error: "participantDetails required" });

  try {
    // Check if the event exists
    const organiser = await ORG.findOne({ _id: eventId });
    if (!organiser) return res.status(404).json({ error: "Event not found" });

    // Organiser cannot register for own event
    if (organiser.shortId === req.user._id.toString()) {
      return res
        .status(403)
        .json({ error: "Organiser cannot register for own event" });
    }

    // Check if user is already registered
    const existing = await PCT.findOne({ eventId, userId: req.user._id });
    if (existing) {
      return res
        .status(400)
        .json({ error: "Already registered for this event" });
    }

    // Create participant with details
    let participant = await PCT.create({
      eventId,
      userId: req.user._id,
      phone: participantDetails.phone,
      age: participantDetails.age,
      bloodType: participantDetails.bloodType || "B+",
      medicalConditions: participantDetails.medicalConditions || "None",
    });

    // Populate user info
    participant = await participant.populate("userId", "name email");

    res.status(201).json({ success: true, participant });
  } catch (err) {
    // Handle unique phone conflict
    if (err.code === 11000 && err.keyValue?.phone) {
      return res.status(400).json({ error: "Phone number already registered" });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET PARTICIPANTS FOR AN EVENT
router.get("/participants/:eventId", authMiddleware, async (req, res) => {
  const { eventId } = req.params;
  if (!eventId) return res.status(400).json({ error: "eventId required" });

  try {
    const participants = await PCT.find({ eventId })
      .populate("userId", "firstName lastName email")
      .sort({ registeredAt: 1 });

    res.status(200).json({ success: true, participants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// VERIFY + REWARD PARTICIPANT
router.post("/verify/:participantId", authMiddleware, async (req, res) => {
  const { participantId } = req.params;
  console.log("verifying");
  if (!participantId)
    return res.status(400).json({ error: "participantId required" });

  try {
    const participant = await PCT.findById(participantId);
    if (!participant) {
      return res.status(404).json({ error: "Participant not found" });
    }

    if (participant.verified) {
      return res.status(400).json({ error: "Participant already verified" });
    }

    const walletDoc = await DNT.findOne({
      shortId: participant.userId.toString(),
    });
    if (!walletDoc) {
      return res.status(404).json({ error: "Wallet not found for user" });
    }

    const rewardAmount = 10;
    if (walletDoc.walletAddress) {
      await setUserReward(walletDoc.walletAddress, rewardAmount);
    }

    participant.verified = true;
    await participant.save();

    walletDoc.reward = (walletDoc.reward || 0) + rewardAmount;
    await walletDoc.save();

    res.status(200).json({
      success: true,
      message: "Participant verified, rewarded and wallet updated",
      participant,
      walletDoc,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
