import { DataTypes, Model, Op } from "sequelize";
import { sequelize } from "../config/db.js";

// Nested, variable-shaped pieces (statusHistory, qualityMetrics,
// featuresUsed, metadata, errors, feedback, joinedParticipants) are kept as
// JSONB rather than normalized into their own tables — they're only ever
// read/written as a whole blob per call, same as they were as embedded
// Mongo sub-documents.
export class VideoCallSession extends Model {
  addParticipant(userId) {
    if (!this.participantIds.includes(userId)) {
      this.participantIds = [...this.participantIds, userId];
    }
    return this;
  }

  joinCall(userId) {
    const joined = this.joinedParticipants || [];
    const existing = joined.find((p) => p.userId === userId && !p.leftAt);

    if (!existing) {
      this.joinedParticipants = [
        ...joined,
        { userId, joinedAt: new Date() },
      ];

      if (this.status === "waiting") {
        this.status = "active";
        this.startedAt = new Date();
      }
    }

    return this;
  }

  leaveCall(userId) {
    const joined = this.joinedParticipants || [];
    const idx = joined.findIndex((p) => p.userId === userId && !p.leftAt);

    if (idx !== -1) {
      const leftAt = new Date();
      const participant = {
        ...joined[idx],
        leftAt,
        duration: Math.round((leftAt - new Date(joined[idx].joinedAt)) / 1000),
      };
      const updated = [...joined];
      updated[idx] = participant;
      this.joinedParticipants = updated;
    }

    return this;
  }

  get activeParticipantsCount() {
    return (this.joinedParticipants || []).filter((p) => !p.leftAt).length;
  }

  get totalParticipantsCount() {
    return (this.participantIds || []).length;
  }

  get durationInMinutes() {
    return this.duration ? Math.round(this.duration / 60) : 0;
  }

  get isSuccessful() {
    return this.status === "ended" && this.duration > 0;
  }

  static findActiveCallsForUser(userId) {
    return VideoCallSession.findAll({
      where: {
        participantIds: { [Op.contains]: [userId] },
        status: { [Op.in]: ["waiting", "active"] },
      },
    });
  }

  static async getCallStats(userId, startDate, endDate) {
    const where = { participantIds: { [Op.contains]: [userId] } };
    if (startDate && endDate) {
      where.createdAt = { [Op.gte]: new Date(startDate), [Op.lte]: new Date(endDate) };
    }
    const sessions = await VideoCallSession.findAll({ where });

    return {
      totalCalls: sessions.length,
      completedCalls: sessions.filter((s) => s.status === "ended").length,
      totalDuration: sessions.reduce((sum, s) => sum + (s.duration || 0), 0),
      averageDuration:
        sessions.length > 0
          ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length
          : 0,
      callsByType: sessions.map((s) => ({ type: s.callType, status: s.status })),
    };
  }
}

VideoCallSession.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    roomId: { type: DataTypes.STRING, allowNull: false, unique: true },
    appointmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "appointment_id",
      references: { model: "appointments", key: "id" },
    },
    initiatorId: { type: DataTypes.UUID, allowNull: false, field: "initiator_id" },
    initiatorModel: {
      type: DataTypes.ENUM("Doctor", "Patient", "HealthWorker", "User"),
      allowNull: false,
    },
    participantIds: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: false,
      defaultValue: [],
    },
    participantModel: {
      type: DataTypes.ENUM("Doctor", "Patient", "HealthWorker", "User"),
      allowNull: false,
      defaultValue: "User",
    },
    joinedParticipants: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    callType: {
      type: DataTypes.ENUM("video", "audio"),
      allowNull: false,
      defaultValue: "video",
    },
    status: {
      type: DataTypes.ENUM("waiting", "active", "ended", "failed", "cancelled"),
      allowNull: false,
      defaultValue: "waiting",
    },
    statusHistory: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    startedAt: { type: DataTypes.DATE, allowNull: true },
    endedAt: { type: DataTypes.DATE, allowNull: true },
    endedBy: { type: DataTypes.UUID, allowNull: true },
    duration: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    qualityMetrics: { type: DataTypes.JSONB, allowNull: true },
    featuresUsed: { type: DataTypes.JSONB, allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    errors: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    feedback: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  },
  {
    sequelize,
    modelName: "VideoCallSession",
    tableName: "video_call_sessions",
    timestamps: true,
    hooks: {
      beforeSave(session) {
        if (
          session.status === "ended" &&
          session.startedAt &&
          session.endedAt &&
          !session.duration
        ) {
          session.duration = Math.round((session.endedAt - session.startedAt) / 1000);
        }
      },
    },
    indexes: [
      { fields: ["appointment_id"] },
      { fields: ["status"] },
      { fields: ["createdAt"] },
    ],
  }
);

export default VideoCallSession;