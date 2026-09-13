import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

export class Chat extends Model { }

Chat.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    appointmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "appointment_id",
      references: { model: "appointments", key: "id" },
    },
    doctorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "doctor_id",
      references: { model: "doctor_profiles", key: "id" },
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "patient_id",
      references: { model: "patient_profiles", key: "id" },
    },
    // Array of { senderId, message, timestamp } — kept as JSONB (was an
    // embedded Mongo sub-document array); split into its own table later
    // if messages need to be queried/paginated individually.
    messages: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    lastUpdated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: "Chat",
    tableName: "chats",
    timestamps: true,
  }
);

export default Chat;