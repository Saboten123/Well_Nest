import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

export class NGOProfile extends Model { }

NGOProfile.init(
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
    orgName: { type: DataTypes.STRING, allowNull: true },
    registrationNumber: { type: DataTypes.STRING, allowNull: true },
    mission: { type: DataTypes.TEXT, allowNull: true },
    website: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    services: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true },
    // Array of { title, body, createdAt } — kept as JSONB, same reasoning
    // as HealthWorkerProfile.blogs.
    blogs: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    isProfileComplete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: "NGOProfile",
    tableName: "ngo_profiles",
    timestamps: true,
  }
);

export default NGOProfile;