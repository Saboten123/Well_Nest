// routes/videoCall.routes.js
import express from "express";
import { body, param } from "express-validator";
import { authRequired } from "../middlewares/auth.js";
import {
  createCallSession,
  getCallSession,
  endCallSession,
  getCallHistory,
  updateCallStatus,
  joinCallSession,
} from "../controllers/videoCall.controller.js";

const router = express.Router();

// All video call routes require authentication
router.use(authRequired);

/**
 * @route   POST /video-call/create
 * @desc    Create a new video call session
 * @access  Private (Doctor, Patient, Health Worker)
 */
router.post(
  "/create",
  [
    body("appointmentId").notEmpty().withMessage("Appointment ID is required"),
    body("participantIds")
      .isArray({ min: 1 })
      .withMessage("At least one participant is required"),
    body("callType")
      .optional()
      .isIn(["video", "audio"])
      .withMessage("Call type must be video or audio"),
  ],
  createCallSession
);

/**
 * @route   POST /video-call/join/:roomId
 * @desc    Join an existing video call session
 * @access  Private
 */
router.post(
  "/join/:roomId",
  [param("roomId").notEmpty().withMessage("Room ID is required")],
  joinCallSession
);

/**
 * @route   GET /video-call/session/:roomId
 * @desc    Get video call session details
 * @access  Private
 */
router.get(
  "/session/:roomId",
  [param("roomId").notEmpty().withMessage("Room ID is required")],
  getCallSession
);

/**
 * @route   PUT /video-call/end/:roomId
 * @desc    End a video call session
 * @access  Private
 */
router.put(
  "/end/:roomId",
  [param("roomId").notEmpty().withMessage("Room ID is required")],
  endCallSession
);

/**
 * @route   PUT /video-call/status/:roomId
 * @desc    Update call session status
 * @access  Private
 */
router.put(
  "/status/:roomId",
  [
    param("roomId").notEmpty().withMessage("Room ID is required"),
    body("status")
      .isIn(["waiting", "active", "ended", "failed"])
      .withMessage("Invalid status"),
  ],
  updateCallStatus
);

/**
 * @route   GET /video-call/history
 * @desc    Get user's call history
 * @access  Private
 */
router.get("/history", getCallHistory);

/**
 * @route   GET /video-call/turn-credentials
 * @desc    Get TURN server credentials for NAT traversal
 * @access  Private
 */
router.get("/turn-credentials", (req, res) => {
  // In production, you'd generate temporary credentials
  // For now, return static STUN/TURN configuration
  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // Add TURN servers in production
    // {
    //   urls: 'turn:your-turn-server.com:3478',
    //   username: 'temporary-username',
    //   credential: 'temporary-password'
    // }
  ];

  res.json({
    success: true,
    data: {
      iceServers,
      ttl: 3600, // 1 hour
    },
  });
});

export default router;
