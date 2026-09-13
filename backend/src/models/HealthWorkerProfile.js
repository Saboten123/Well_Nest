import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

export class HealthWorkerProfile extends Model { }

HealthWorkerProfile.init(
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
    employer: { type: DataTypes.STRING, allowNull: true },
    certId: { type: DataTypes.STRING, allowNull: true },
    region: { type: DataTypes.STRING, allowNull: true },
    // Array of { title, body, createdAt } — kept as JSONB rather than a
    // separate table since blogs are only ever read/written as a whole list.
    blogs: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    isProfileComplete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: "HealthWorkerProfile",
    tableName: "health_worker_profiles",
    timestamps: true,
  }
);

export default HealthWorkerProfile;