import express from "express";
import { Op } from "sequelize";
import Chat from "../models/Chats.js";
import Appointment from "../models/Appointments.js";
import DoctorProfile from "../models/DoctorProfile.js";
import PatientProfile from "../models/PatientProfile.js";
import { authRequired } from "../middlewares/auth.js";

const router = express.Router();

// Postgres uses UUID primary keys — this replaces
// mongoose.Types.ObjectId.isValid() for request param validation.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidId = (id) => typeof id === "string" && UUID_RE.test(id);

// Get all chats for a user
router.get("/my-chats", authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.role;

    const where =
      userType === "doctor" ? { doctorId: userId } : { patientId: userId };

    const chats = await Chat.findAll({
      where,
      attributes: ["id", "appointmentId", "doctorId", "patientId", "lastUpdated", "messages"],
      include: [
        { model: Appointment },
        { model: DoctorProfile, attributes: ["name", "specialization"] },
        { model: PatientProfile, attributes: ["name", "email"] },
      ],
      order: [["lastUpdated", "DESC"]],
    });

    const formattedChats = chats.map((chat) => ({
      _id: chat.id,
      appointmentId: chat.Appointment,
      doctor: chat.DoctorProfile,
      patient: chat.PatientProfile,
      lastMessage:
        chat.messages.length > 0
          ? chat.messages[chat.messages.length - 1]
          : null,
      lastUpdated: chat.lastUpdated,
      messageCount: chat.messages.length,
    }));

    res.json({
      success: true,
      data: formattedChats,
    });
  } catch (error) {
    console.error("Get chats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get chats",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get specific chat history with pagination
router.get("/appointment/:appointmentId", authRequired, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;

    // Validate appointmentId format
    if (!isValidId(appointmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID format",
      });
    }

    const chat = await Chat.findOne({
      where: {
        appointmentId,
        [Op.or]: [{ doctorId: userId }, { patientId: userId }],
      },
      include: [
        { model: DoctorProfile, attributes: ["name", "email"] },
        { model: PatientProfile, attributes: ["name", "email"] },
        { model: Appointment },
      ],
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found or unauthorized",
      });
    }

    // Fixed pagination logic - get most recent messages first
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const totalMessages = chat.messages.length;

    // Calculate pagination from the end (most recent messages)
    const startIndex = Math.max(0, totalMessages - pageNum * limitNum);
    const endIndex = totalMessages - (pageNum - 1) * limitNum;

    const messages = chat.messages.slice(startIndex, endIndex).reverse(); // Most recent first

    res.json({
      success: true,
      data: {
        chat: {
          _id: chat.id,
          appointmentId: chat.Appointment,
          doctor: chat.DoctorProfile,
          patient: chat.PatientProfile,
          lastUpdated: chat.lastUpdated,
        },
        messages,
        totalMessages,
        currentPage: pageNum,
        totalPages: Math.ceil(totalMessages / limitNum),
        hasMore: startIndex > 0,
      },
    });
  } catch (error) {
    console.error("Get chat history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get chat history",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Create a new chat
router.post("/create", authRequired, async (req, res) => {
  try {
    const { appointmentId, doctorId, patientId } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!appointmentId || !doctorId || !patientId) {
      return res.status(400).json({
        success: false,
        message: "appointmentId, doctorId, and patientId are required",
      });
    }

    // Validate ID format
    if (
      !isValidId(appointmentId) ||
      !isValidId(doctorId) ||
      !isValidId(patientId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    // Verify user has permission to create this chat
    if (userId !== doctorId && userId !== patientId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to create this chat",
      });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({ where: { appointmentId } });

    if (chat) {
      return res.status(200).json({
        success: true,
        message: "Chat already exists",
        data: chat,
      });
    }

    // Create new chat
    chat = await Chat.create({
      appointmentId,
      doctorId,
      patientId,
      messages: [],
      lastUpdated: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Chat created successfully",
      data: chat,
    });
  } catch (error) {
    console.error("Create chat error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create chat",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Send a message (better naming than "update")
router.post("/send-message", authRequired, async (req, res) => {
  try {
    const { appointmentId, message } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!appointmentId || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "appointmentId and message are required",
      });
    }

    // Validate appointmentId format
    if (!isValidId(appointmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID format",
      });
    }

    // Find the chat
    const chat = await Chat.findOne({
      where: {
        appointmentId,
        [Op.or]: [{ doctorId: userId }, { patientId: userId }],
      },
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found or unauthorized",
      });
    }

    // Add the new message
    const newMessage = {
      senderId: userId,
      message: message.trim(),
      timestamp: new Date(),
    };

    // Reassign (not .push) so Sequelize's dirty-checking on the JSONB
    // column actually picks up the change.
    chat.messages = [...chat.messages, newMessage];
    chat.lastUpdated = new Date();

    // Save the updated chat
    await chat.save();

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: {
        message: newMessage,
        totalMessages: chat.messages.length,
      },
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get chat by chatId (keep this for backward compatibility)
router.get("/:chatId/messages", authRequired, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Validate chatId format
    if (!isValidId(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat ID format",
      });
    }

    // Find chat with related records
    const chat = await Chat.findByPk(chatId, {
      include: [
        { model: DoctorProfile, attributes: ["name", "email"] },
        { model: PatientProfile, attributes: ["name", "email"] },
        { model: Appointment },
      ],
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    // Verify user has permission to view this chat
    if (userId !== chat.doctorId && userId !== chat.patientId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view this chat",
      });
    }

    res.status(200).json({
      success: true,
      message: "Chat retrieved successfully",
      data: chat,
    });
  } catch (error) {
    console.error("Get chat error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve chat",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Search messages in a chat
router.get(
  "/appointment/:appointmentId/search",
  authRequired,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const { q: searchTerm, limit = 20 } = req.query;
      const userId = req.user.id; // Consistent user ID access

      if (!searchTerm?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Search term is required",
        });
      }

      // Validate appointmentId format
      if (!isValidId(appointmentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid appointment ID format",
        });
      }

      const chat = await Chat.findOne({
        where: {
          appointmentId,
          [Op.or]: [{ doctorId: userId }, { patientId: userId }],
        },
        include: [
          { model: DoctorProfile, attributes: ["name"] },
          { model: PatientProfile, attributes: ["name"] },
        ],
      });

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found or unauthorized",
        });
      }

      const searchTermLower = searchTerm.trim().toLowerCase();
      const matchingMessages = chat.messages
        .filter((msg) => msg.message.toLowerCase().includes(searchTermLower))
        .slice(-parseInt(limit)) // Get most recent matches
        .reverse(); // Most recent first

      res.json({
        success: true,
        data: {
          messages: matchingMessages,
          searchTerm,
          totalMatches: matchingMessages.length,
          chat: {
            _id: chat.id,
            appointmentId: chat.appointmentId,
            doctor: chat.DoctorProfile,
            patient: chat.PatientProfile,
          },
        },
      });
    } catch (error) {
      console.error("Search messages error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to search messages",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// Mark chat as read (optional feature)
router.patch("/:chatId/mark-read", authRequired, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Validate chatId format
    if (!isValidId(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat ID format",
      });
    }

    const chat = await Chat.findOne({
      where: {
        id: chatId,
        [Op.or]: [{ doctorId: userId }, { patientId: userId }],
      },
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found or unauthorized",
      });
    }

    // You can add read status logic here if needed
    // For now, just update lastUpdated
    chat.lastUpdated = new Date();
    await chat.save();

    res.json({
      success: true,
      message: "Chat marked as read",
    });
  } catch (error) {
    console.error("Mark read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark chat as read",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

export default router;