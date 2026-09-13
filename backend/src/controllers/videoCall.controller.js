// controllers/videoCall.controller.js
import { v4 as uuidv4 } from "uuid";
import { Op } from "sequelize";
// NOTE: filename is lowercase-first (videoCallSession.model.js) — the old
// import here ("VideoCallSession.model.js") only worked on case-insensitive
// filesystems (Mac/Windows) and would 404 on Render's Linux containers.
import VideoCallSession from "../models/videoCallSession.model.js";
import Appointment from "../models/Appointments.js";
import DoctorProfile from "../models/DoctorProfile.js";
import PatientProfile from "../models/PatientProfile.js";
import User from "../models/User.js";
import { sendVideoCallInviteEmail, sendAppointmentCompletedEmail } from "../utils/mailer.js";

// initiatorModel/participantModel are always "User" in this app, so we
// resolve participant info directly against the User table.
async function resolveUserSummary(userId) {
  if (!userId) return null;
  return User.findByPk(userId, { attributes: ["id", "firstName", "lastName", "role"] });
}

/**
 * Create a new video call session
 */
export const createCallSession = async (req, res) => {
  try {
    const { appointmentId, participantIds, callType = "video" } = req.body;
    const initiatorId = req.user.id;

    // Verify appointment exists and user has permission
    const appointment = await Appointment.findByPk(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check if user is part of the appointment. doctorId/patientId on the
    // appointment point to DoctorProfile/PatientProfile rows, not Users
    // directly, so resolve their userId before comparing.
    const [doctorProfile, patientProfile] = await Promise.all([
      DoctorProfile.findByPk(appointment.doctorId),
      PatientProfile.findByPk(appointment.patientId),
    ]);

    const isAuthorized =
      doctorProfile?.userId === initiatorId ||
      patientProfile?.userId === initiatorId;

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to create call for this appointment",
      });
    }

    // Generate unique room ID
    const roomId = `room_${uuidv4().replace(/-/g, "")}`;

    // Create call session
    const callSession = await VideoCallSession.create({
      roomId,
      appointmentId,
      initiatorId,
      initiatorModel: "User",
      participantIds: [...new Set([initiatorId, ...participantIds])], // Remove duplicates
      participantModel: "User",
      callType,
      status: "waiting",
      metadata: {
        appointmentType: appointment.type,
        scheduledTime: appointment.scheduledTime,
      },
    });

    // If the doctor started the call, email the patient the meeting ID.
    // Failure to email should never fail call creation.
    try {
      const doctorStartedCall = doctorProfile?.userId === initiatorId;

      if (doctorStartedCall) {
        const patientProfileWithUser = await PatientProfile.findByPk(appointment.patientId, {
          include: [{ model: User, attributes: ["email"] }],
        });
        if (patientProfileWithUser?.User?.email) {
          const joinLink = `${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/video-call`;
          await sendVideoCallInviteEmail(patientProfileWithUser.User.email, {
            doctorName: doctorProfile?.name,
            roomId,
            joinLink,
          });
        }
      }
    } catch (emailErr) {
      console.error("Failed to send video call invite email:", emailErr);
    }

    res.status(201).json({
      success: true,
      message: "Video call session created successfully",
      data: {
        roomId: callSession.roomId,
        sessionId: callSession.id,
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

    const callSession = await VideoCallSession.findOne({ where: { roomId } });
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
    const joined = callSession.joinedParticipants || [];
    if (!joined.some((p) => p.userId === userId)) {
      callSession.joinedParticipants = [
        ...joined,
        { userId, joinedAt: new Date() },
      ];
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
        sessionId: callSession.id,
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

    const callSession = await VideoCallSession.findOne({ where: { roomId } });

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
        message: "Not authorized to access this call session",
      });
    }

    const [initiator, participants] = await Promise.all([
      resolveUserSummary(callSession.initiatorId),
      Promise.all(callSession.participantIds.map(resolveUserSummary)),
    ]);
    const joinedParticipants = await Promise.all(
      (callSession.joinedParticipants || []).map(async (p) => ({
        ...p,
        user: await resolveUserSummary(p.userId),
      }))
    );

    res.json({
      success: true,
      data: { ...callSession.toJSON(), initiator, participants, joinedParticipants },
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

    const callSession = await VideoCallSession.findOne({ where: { roomId } });
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

    // Mark the linked appointment as ended and email both sides.
    // Failure to email should never fail ending the call.
    try {
      const appointment = await Appointment.findByPk(callSession.appointmentId);
      if (appointment) {
        appointment.status = "ended";
        await appointment.save();

        const [doctorProfile, patientProfile] = await Promise.all([
          DoctorProfile.findByPk(appointment.doctorId, { include: [{ model: User, attributes: ["email"] }] }),
          PatientProfile.findByPk(appointment.patientId, { include: [{ model: User, attributes: ["email"] }] }),
        ]);

        if (doctorProfile?.User?.email) {
          await sendAppointmentCompletedEmail(doctorProfile.User.email, {
            recipientRole: "doctor",
            otherPartyName: patientProfile?.name,
            scheduledTime: appointment.scheduledTime,
          });
        }
        if (patientProfile?.User?.email) {
          await sendAppointmentCompletedEmail(patientProfile.User.email, {
            recipientRole: "patient",
            otherPartyName: doctorProfile?.name,
            scheduledTime: appointment.scheduledTime,
          });
        }
      }
    } catch (emailErr) {
      console.error("Failed to send appointment completed email:", emailErr);
    }

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

    const callSession = await VideoCallSession.findOne({ where: { roomId } });
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

    // Log status change (reassign so the JSONB column is picked up as dirty)
    callSession.statusHistory = [
      ...(callSession.statusHistory || []),
      { status, changedBy: userId, changedAt: new Date(), previousStatus: oldStatus },
    ];

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

    const where = { participantIds: { [Op.contains]: [userId] } };
    if (status) where.status = status;

    // Get calls with pagination
    const calls = await VideoCallSession.findAll({
      where,
      include: [{ model: Appointment }],
      order: [["createdAt", "DESC"]],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
    });

    // Bulk-resolve initiator names instead of one lookup per call
    const initiatorIds = [...new Set(calls.map((c) => c.initiatorId).filter(Boolean))];
    const initiators = await User.findAll({
      where: { id: initiatorIds },
      attributes: ["id", "firstName", "lastName", "role"],
    });
    const initiatorMap = new Map(initiators.map((u) => [u.id, u]));
    const callsWithInitiator = calls.map((c) => ({
      ...c.toJSON(),
      initiator: initiatorMap.get(c.initiatorId) || null,
    }));

    const totalCalls = await VideoCallSession.count({ where });

    // Calculate pagination info
    const totalPages = Math.ceil(totalCalls / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        calls: callsWithInitiator,
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