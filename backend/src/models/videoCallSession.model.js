// models/VideoCallSession.model.js
import mongoose from "mongoose";

const videoCallSessionSchema = new mongoose.Schema(
  {
    // Unique room identifier for WebRTC connection
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Associated appointment
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },

    // User who initiated the call
    initiatorId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "initiatorModel",
      required: true,
    },

    // Dynamic reference model for initiator (Doctor, Patient, HealthWorker)
    initiatorModel: {
      type: String,
      required: true,
      enum: ["Doctor", "Patient", "HealthWorker", "User"], // Adjust based on your user models
    },

    // All authorized participants
    participantIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "participantModel",
      },
    ],

    // Dynamic reference for participants
    participantModel: {
      type: String,
      default: "User",
      enum: ["Doctor", "Patient", "HealthWorker", "User"],
    },

    // Participants who actually joined the call
    joinedParticipants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "participantModel",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        leftAt: Date,
        duration: Number, // Time spent in call (seconds)
      },
    ],

    // Call configuration
    callType: {
      type: String,
      enum: ["video", "audio"],
      default: "video",
    },

    // Call status tracking
    status: {
      type: String,
      enum: ["waiting", "active", "ended", "failed", "cancelled"],
      default: "waiting",
    },

    // Status change history
    statusHistory: [
      {
        status: String,
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "participantModel",
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        previousStatus: String,
        reason: String,
      },
    ],

    // Call timing
    createdAt: {
      type: Date,
      default: Date.now,
    },

    startedAt: Date,

    endedAt: Date,

    // Who ended the call
    endedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "participantModel",
    },

    // Call duration in seconds
    duration: {
      type: Number,
      default: 0,
    },

    // Call quality metrics
    qualityMetrics: {
      averageLatency: Number, // ms
      packetsLost: Number,
      maxParticipants: Number,
      connectionIssues: [
        {
          participantId: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "participantModel",
          },
          issue: String,
          timestamp: Date,
          resolved: Boolean,
        },
      ],
    },

    // Call features used
    featuresUsed: {
      screenShare: {
        used: { type: Boolean, default: false },
        participants: [
          {
            userId: {
              type: mongoose.Schema.Types.ObjectId,
              refPath: "participantModel",
            },
            startTime: Date,
            endTime: Date,
          },
        ],
      },
      recording: {
        enabled: { type: Boolean, default: false },
        startTime: Date,
        endTime: Date,
        fileUrl: String,
        fileSize: Number,
      },
      chat: {
        used: { type: Boolean, default: false },
        messageCount: { type: Number, default: 0 },
      },
    },

    // Technical metadata
    metadata: {
      appointmentType: String,
      scheduledTime: Date,
      platform: {
        type: String,
        enum: ["web", "mobile", "desktop"],
        default: "web",
      },
      clientVersions: [
        {
          participantId: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "participantModel",
          },
          userAgent: String,
          sdkVersion: String,
        },
      ],
      serverRegion: String,
      iceServers: [String],
    },

    // Error tracking
    errors: [
      {
        errorCode: String,
        errorMessage: String,
        participantId: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "participantModel",
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        resolved: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Call rating and feedback
    feedback: [
      {
        participantId: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "participantModel",
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
        audioQuality: {
          type: Number,
          min: 1,
          max: 5,
        },
        videoQuality: {
          type: Number,
          min: 1,
          max: 5,
        },
        connectionStability: {
          type: Number,
          min: 1,
          max: 5,
        },
        overallExperience: {
          type: Number,
          min: 1,
          max: 5,
        },
        comments: String,
        submittedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
videoCallSessionSchema.index({ appointmentId: 1 });
videoCallSessionSchema.index({ participantIds: 1 });
videoCallSessionSchema.index({ status: 1 });
videoCallSessionSchema.index({ createdAt: -1 });
videoCallSessionSchema.index({ "joinedParticipants.userId": 1 });

// Virtual for active participants count
videoCallSessionSchema.virtual("activeParticipantsCount").get(function () {
  return this.joinedParticipants.filter((p) => !p.leftAt).length;
});

// Virtual for total participants count
videoCallSessionSchema.virtual("totalParticipantsCount").get(function () {
  return this.participantIds.length;
});

// Virtual for call duration in minutes
videoCallSessionSchema.virtual("durationInMinutes").get(function () {
  return this.duration ? Math.round(this.duration / 60) : 0;
});

// Virtual for call success status
videoCallSessionSchema.virtual("isSuccessful").get(function () {
  return this.status === "ended" && this.duration > 0;
});

// Pre-save middleware to update duration
videoCallSessionSchema.pre("save", function (next) {
  // Auto-calculate duration if ending call
  if (
    this.status === "ended" &&
    this.startedAt &&
    this.endedAt &&
    !this.duration
  ) {
    this.duration = Math.round((this.endedAt - this.startedAt) / 1000);
  }

  // Set initiator model based on existing user models
  if (this.isNew && !this.initiatorModel) {
    this.initiatorModel = "User"; // Default, adjust based on your setup
  }

  next();
});

// Instance method to add participant
videoCallSessionSchema.methods.addParticipant = function (userId) {
  if (!this.participantIds.includes(userId)) {
    this.participantIds.push(userId);
  }
  return this;
};

// Instance method to join call
videoCallSessionSchema.methods.joinCall = function (userId) {
  const existing = this.joinedParticipants.find(
    (p) => p.userId.toString() === userId.toString() && !p.leftAt
  );

  if (!existing) {
    this.joinedParticipants.push({
      userId,
      joinedAt: new Date(),
    });

    // Update to active if first participant joins
    if (this.status === "waiting") {
      this.status = "active";
      this.startedAt = new Date();
    }
  }

  return this;
};

// Instance method to leave call
videoCallSessionSchema.methods.leaveCall = function (userId) {
  const participant = this.joinedParticipants.find(
    (p) => p.userId.toString() === userId.toString() && !p.leftAt
  );

  if (participant) {
    participant.leftAt = new Date();
    participant.duration = Math.round(
      (participant.leftAt - participant.joinedAt) / 1000
    );
  }

  return this;
};

// Static method to find active calls for user
videoCallSessionSchema.statics.findActiveCallsForUser = function (userId) {
  return this.find({
    participantIds: userId,
    status: { $in: ["waiting", "active"] },
  });
};

// Static method to get call statistics
videoCallSessionSchema.statics.getCallStats = function (
  userId,
  startDate,
  endDate
) {
  const matchStage = {
    participantIds: mongoose.Types.ObjectId(userId),
  };

  if (startDate && endDate) {
    matchStage.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalCalls: { $sum: 1 },
        completedCalls: {
          $sum: { $cond: [{ $eq: ["$status", "ended"] }, 1, 0] },
        },
        totalDuration: { $sum: "$duration" },
        averageDuration: { $avg: "$duration" },
        callsByType: {
          $push: {
            type: "$callType",
            status: "$status",
          },
        },
      },
    },
  ]);
};

const VideoCallSession = mongoose.model(
  "VideoCallSession",
  videoCallSessionSchema
);

export default VideoCallSession;
