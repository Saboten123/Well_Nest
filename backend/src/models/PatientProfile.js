import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

export class PatientProfile extends Model { }

PatientProfile.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: "user_id",
      references: { model: "users", key: "id" },
    },
    name: { type: DataTypes.STRING, allowNull: true },
    isProfileComplete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: "PatientProfile",
    tableName: "patient_profiles",
    timestamps: true,
  }
);

export default PatientProfile;