// controllers/videoCall.controller.js
import { v4 as uuidv4 } from "uuid";
import VideoCallSession from "../models/VideoCallSession.model.js";
import Appointment from "../models/Appointments.js"; // Updated to match your schema file

/**
 * Create a new video call session
 */
export const createCallSession = async (req, res) => {
  try {
    const { appointmentId, participantIds, callType = "video" } = req.body;
    const initiatorId = req.user.id;

    // Verify appointment exists and user has permission
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check if user is part of the appointment
    const isAuthorized =
      appointment.doctorId?.toString() === initiatorId ||
      appointment.patientId?.toString() === initiatorId ||
      appointment.healthWorkerId?.toString() === initiatorId;

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to create call for this appointment",
      });
    }

    // Generate unique room ID
    const roomId = `room_${uuidv4().replace(/-/g, "")}`;

    // Create call session
    const callSession = new VideoCallSession({
      roomId,
      appointmentId,
      initiatorId,
      participantIds: [...new Set([initiatorId, ...participantIds])], // Remove duplicates
      callType,
      status: "waiting",
      createdAt: new Date(),
      metadata: {
        appointmentType: appointment.type,
        scheduledTime: appointment.scheduledTime,
      },
    });

    await callSession.save();

    // Update appointment with call session
    appointment.videoCallSessionId = callSession._id;
    await appointment.save();

    res.status(201).json({
      success: true,
      message: "Video call session created successfully",
      data: {
        roomId: callSession.roomId,
        sessionId: callSession._id,
        participantIds: callSession.participantIds,
        callType: callSession.callType,
        status: callSession.status,
        createdAt: callSession.createdAt,
      },
    });
  } catch (error) {
    console.error("Create call session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create video call session",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Join an existing video call session
 */
export const joinCallSession = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const callSession = await VideoCallSession.findOne({ roomId });
    if (!callSession) {
      return res.status(404).json({
        success: false,
        message: "Call session not found",
      });
    }

    // Check if user is authorized to join
    if (!callSession.participantIds.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to join this call",
      });
    }

    // Check if call is still active
    if (callSession.status === "ended") {
      return res.status(400).json({
        success: false,
        message: "Call has already ended",
      });
    }

    // Add to joined participants if not already there
    if (
      !callSession.joinedParticipants.some(
        (p) => p.userId.toString() === userId
      )
    ) {
      callSession.joinedParticipants.push({
        userId,
        joinedAt: new Date(),
      });
    }

    // Update status to active if this is the first join
    if (callSession.status === "waiting") {
      callSession.status = "active";
      callSession.startedAt = new Date();
    }

    await callSession.save();

    res.json({
      success: true,
      message: "Joined call session successfully",
      data: {
        roomId: callSession.roomId,
        sessionId: callSession._id,
        participantIds: callSession.participantIds,
        joinedParticipants: callSession.joinedParticipants,
        callType: callSession.callType,
        status: callSession.status,
        startedAt: callSession.startedAt,
      },
    });
  } catch (error) {
    console.error("Join call session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to join call session",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get video call session details
 */
export const getCallSession = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const callSession = await VideoCallSession.findOne({ roomId })
      .populate("initiatorId", "name role")
      .populate("participantIds", "name role")
      .populate("joinedParticipants.userId", "name role");

    if (!callSession) {
      return res.status(404).json({
        success: false,
        message: "Call session not found",
      });
    }

    // Check authorization
    if (!callSession.participantIds.some((p) => p._id.toString() === userId)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this call session",
      });
    }

    res.json({
      success: true,
      data: callSession,
    });
  } catch (error) {
    console.error("Get call session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get call session",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * End a video call session
 */
export const endCallSession = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const callSession = await VideoCallSession.findOne({ roomId });
    if (!callSession) {
      return res.status(404).json({
        success: false,
        message: "Call session not found",
      });
    }

    // Check authorization (only participants can end the call)
    if (!callSession.participantIds.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to end this call",
      });
    }

    // Update call session
    callSession.status = "ended";
    callSession.endedAt = new Date();
    callSession.endedBy = userId;

    // Calculate duration if call was active
    if (callSession.startedAt) {
      callSession.duration = Math.round(
        (callSession.endedAt - callSession.startedAt) / 1000 // Duration in seconds
      );
    }

    await callSession.save();

    res.json({
      success: true,
      message: "Call session ended successfully",
      data: {
        roomId: callSession.roomId,
        status: callSession.status,
        endedAt: callSession.endedAt,
        duration: callSession.duration,
      },
    });
  } catch (error) {
    console.error("End call session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to end call session",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Update call session status
 */
export const updateCallStatus = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    const callSession = await VideoCallSession.findOne({ roomId });
    if (!callSession) {
      return res.status(404).json({
        success: false,
        message: "Call session not found",
      });
    }

    // Check authorization
    if (!callSession.participantIds.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this call",
      });
    }

    // Update status with timestamp
    const oldStatus = callSession.status;
    callSession.status = status;

    // Add specific timestamps based on status
    switch (status) {
      case "active":
        if (!callSession.startedAt) {
          callSession.startedAt = new Date();
        }
        break;
      case "ended":
        callSession.endedAt = new Date();
        if (callSession.startedAt) {
          callSession.duration = Math.round(
            (callSession.endedAt - callSession.startedAt) / 1000
          );
        }
        break;
      case "failed":
        callSession.endedAt = new Date();
        break;
    }

    // Log status change
    callSession.statusHistory.push({
      status,
      changedBy: userId,
      changedAt: new Date(),
      previousStatus: oldStatus,
    });

    await callSession.save();

    res.json({
      success: true,
      message: "Call status updated successfully",
      data: {
        roomId: callSession.roomId,
        status: callSession.status,
        previousStatus: oldStatus,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Update call status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update call status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get user's call history
 */
export const getCallHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    // Build query
    const query = { participantIds: userId };
    if (status) {
      query.status = status;
    }

    // Get calls with pagination
    const calls = await VideoCallSession.find(query)
      .populate("initiatorId", "name role")
      .populate("appointmentId", "type scheduledTime")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalCalls = await VideoCallSession.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCalls / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        calls,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCalls,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get call history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get call history",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
// 