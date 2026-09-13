import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

export class Appointment extends Model { }

Appointment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    requestedTime: { type: DataTypes.DATE, allowNull: false }, // when patient requests
    scheduledTime: { type: DataTypes.DATE, allowNull: true }, // doctor sets this when accepted
    status: {
      type: DataTypes.ENUM(
        "pending",
        "accepted",
        "rejected",
        "scheduled",
        "ongoing",
        "ended",
        "cancelled"
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    reason: { type: DataTypes.TEXT, allowNull: true }, // patient's reason
    notes: { type: DataTypes.TEXT, allowNull: true }, // doctor's extra notes if any
  },
  {
    sequelize,
    modelName: "Appointment",
    tableName: "appointments",
    timestamps: true,
    indexes: [
      // A doctor can't have two appointments requested for the exact same
      // timestamp, but the same timestamp is fine across different doctors.
      { unique: true, fields: ["doctor_id", "requestedTime"] },
    ],
  }
);

export default Appointment;