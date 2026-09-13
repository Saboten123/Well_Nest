import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

export class DoctorProfile extends Model { }

DoctorProfile.init(
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
    specialization: { type: DataTypes.STRING, allowNull: true },
    licenseNumber: { type: DataTypes.STRING, allowNull: true },
    affiliation: { type: DataTypes.STRING, allowNull: true },
    gender: { type: DataTypes.STRING, allowNull: true },
    fee: { type: DataTypes.FLOAT, allowNull: true },
    availability: { type: DataTypes.JSONB, allowNull: true },
    isProfileComplete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: "DoctorProfile",
    tableName: "doctor_profiles",
    timestamps: true,
  }
);

export default DoctorProfile;