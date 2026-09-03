// socket/webrtcHandler.js
import jwt from "jsonwebtoken";

// Store active rooms and their participants
const activeRooms = new Map();
const userSockets = new Map(); // userId -> socketId mapping

// WebRTC Socket Authentication Middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.split(" ")[1];

    if (!token) {
      return next(new Error("No token provided"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;

    // Store user-socket mapping
    userSockets.set(decoded.userId, socket.id);

    next();
  } catch (error) {
    next(new Error("Authentication failed"));
  }
};

export const initializeWebRTCSocket = (io) => {
  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    console.log(
      `✅ WebRTC: User ${socket.userId} connected with socket ${socket.id}`
    );

    // Handle joining a video call room
    socket.on("join-room", (data) => {
      const { roomId, appointmentId } = data;

      console.log(`📹 User ${socket.userId} joining room: ${roomId}`);

      // Join the socket room
      socket.join(roomId);

      // Track room participants
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, {
          participants: new Set(),
          appointmentId,
          createdAt: new Date(),
        });
      }

      const room = activeRooms.get(roomId);
      room.participants.add({
        userId: socket.userId,
        socketId: socket.id,
        role: socket.userRole,
        joinedAt: new Date(),
      });

      // Notify other participants about new user
      socket.to(roomId).emit("user-joined", {
        userId: socket.userId,
        role: socket.userRole,
        socketId: socket.id,
      });

      // Send current participants list to the new user
      const otherParticipants = Array.from(room.participants).filter(
        (p) => p.socketId !== socket.id
      );

      socket.emit("room-users", otherParticipants);

      console.log(
        `📊 Room ${roomId} now has ${room.participants.size} participants`
      );
    });

    // Handle WebRTC Offer (Step 1 of connection)
    socket.on("offer", (data) => {
      const { roomId, offer, targetUserId } = data;

      console.log(
        `📤 Offer from ${socket.userId} to ${targetUserId} in room ${roomId}`
      );

      // Send offer to specific user or broadcast to room
      if (targetUserId) {
        const targetSocketId = userSockets.get(targetUserId);
        if (targetSocketId) {
          io.to(targetSocketId).emit("offer", {
            offer,
            fromUserId: socket.userId,
            fromSocketId: socket.id,
            roomId,
          });
        }
      } else {
        socket.to(roomId).emit("offer", {
          offer,
          fromUserId: socket.userId,
          fromSocketId: socket.id,
          roomId,
        });
      }
    });

    // Handle WebRTC Answer (Step 2 of connection)
    socket.on("answer", (data) => {
      const { roomId, answer, targetUserId } = data;

      console.log(
        `📥 Answer from ${socket.userId} to ${targetUserId} in room ${roomId}`
      );

      // Send answer to specific user
      if (targetUserId) {
        const targetSocketId = userSockets.get(targetUserId);
        if (targetSocketId) {
          io.to(targetSocketId).emit("answer", {
            answer,
            fromUserId: socket.userId,
            fromSocketId: socket.id,
            roomId,
          });
        }
      }
    });

    // Handle ICE Candidates (Step 3 of connection)
    socket.on("ice-candidate", (data) => {
      const { roomId, candidate, targetUserId } = data;

      console.log(`🧊 ICE candidate from ${socket.userId} in room ${roomId}`);

      // Send ICE candidate to specific user or broadcast
      if (targetUserId) {
        const targetSocketId = userSockets.get(targetUserId);
        if (targetSocketId) {
          io.to(targetSocketId).emit("ice-candidate", {
            candidate,
            fromUserId: socket.userId,
            fromSocketId: socket.id,
            roomId,
          });
        }
      } else {
        socket.to(roomId).emit("ice-candidate", {
          candidate,
          fromUserId: socket.userId,
          fromSocketId: socket.id,
          roomId,
        });
      }
    });

    // Handle call invitation
    socket.on("invite-to-call", (data) => {
      const { targetUserId, roomId, appointmentId, callType } = data;

      console.log(
        `📞 Call invitation from ${socket.userId} to ${targetUserId}`
      );

      const targetSocketId = userSockets.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("call-invitation", {
          fromUserId: socket.userId,
          fromRole: socket.userRole,
          roomId,
          appointmentId,
          callType: callType || "video", // 'video' or 'audio'
        });
      } else {
        socket.emit("call-error", {
          message: "User is not online",
          code: "USER_OFFLINE",
        });
      }
    });

    // Handle call response (accept/reject)
    socket.on("call-response", (data) => {
      const { targetUserId, accepted, roomId } = data;

      console.log(
        `📞 Call ${accepted ? "accepted" : "rejected"} by ${socket.userId}`
      );

      const targetSocketId = userSockets.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("call-response", {
          fromUserId: socket.userId,
          accepted,
          roomId,
        });
      }
    });

    // Handle media state changes (mute/unmute, video on/off)
    socket.on("media-state-change", (data) => {
      const { roomId, audioEnabled, videoEnabled } = data;

      console.log(
        `🎥 Media state change from ${socket.userId}: audio=${audioEnabled}, video=${videoEnabled}`
      );

      socket.to(roomId).emit("user-media-state-change", {
        userId: socket.userId,
        audioEnabled,
        videoEnabled,
      });

      // Update room participant state
      const room = activeRooms.get(roomId);
      if (room) {
        const participant = Array.from(room.participants).find(
          (p) => p.socketId === socket.id
        );
        if (participant) {
          participant.audioEnabled = audioEnabled;
          participant.videoEnabled = videoEnabled;
        }
      }
    });

    // Handle leaving room
    socket.on("leave-room", (roomId) => {
      handleUserLeaveRoom(socket, roomId);
    });

    // Handle call end
    socket.on("end-call", (data) => {
      const { roomId } = data;

      console.log(`📴 Call ended by ${socket.userId} in room ${roomId}`);

      // Notify all participants
      socket.to(roomId).emit("call-ended", {
        endedBy: socket.userId,
        reason: "user-ended",
      });

      // Clean up room
      handleUserLeaveRoom(socket, roomId);
    });

    // Handle screen sharing
    socket.on("screen-share-start", (data) => {
      const { roomId } = data;

      console.log(`🖥️ Screen sharing started by ${socket.userId}`);

      socket.to(roomId).emit("screen-share-start", {
        userId: socket.userId,
      });
    });

    socket.on("screen-share-stop", (data) => {
      const { roomId } = data;

      console.log(`🖥️ Screen sharing stopped by ${socket.userId}`);

      socket.to(roomId).emit("screen-share-stop", {
        userId: socket.userId,
      });
    });

    // Handle chat messages during video call
    socket.on("call-chat-message", (data) => {
      const { roomId, message, timestamp } = data;

      socket.to(roomId).emit("call-chat-message", {
        fromUserId: socket.userId,
        fromRole: socket.userRole,
        message,
        timestamp,
      });
    });

    // Handle connection quality reports
    socket.on("connection-quality", (data) => {
      const { roomId, quality } = data;

      // You can log this for monitoring or broadcast to other participants
      console.log(`📊 Connection quality from ${socket.userId}: ${quality}`);
    });

    // Handle disconnect
    socket.on("disconnect", (reason) => {
      console.log(`❌ WebRTC: User ${socket.userId} disconnected: ${reason}`);

      // Remove from user mapping
      userSockets.delete(socket.userId);

      // Remove from all rooms
      activeRooms.forEach((room, roomId) => {
        const participant = Array.from(room.participants).find(
          (p) => p.socketId === socket.id
        );

        if (participant) {
          handleUserLeaveRoom(socket, roomId);
        }
      });
    });
  });

  // Helper function to handle user leaving room
  const handleUserLeaveRoom = (socket, roomId) => {
    socket.leave(roomId);

    const room = activeRooms.get(roomId);
    if (room) {
      // Remove participant
      room.participants = new Set(
        Array.from(room.participants).filter((p) => p.socketId !== socket.id)
      );

      // Notify other participants
      socket.to(roomId).emit("user-left", {
        userId: socket.userId,
        leftAt: new Date(),
      });

      // Clean up empty rooms
      if (room.participants.size === 0) {
        activeRooms.delete(roomId);
        console.log(`🗑️ Room ${roomId} deleted (empty)`);
      } else {
        console.log(
          `👥 Room ${roomId} now has ${room.participants.size} participants`
        );
      }
    }
  };

  console.log("🚀 WebRTC Socket handlers initialized");
};
