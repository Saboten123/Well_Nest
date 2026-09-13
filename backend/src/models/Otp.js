import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

export class Otp extends Model { }

Otp.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            set(value) {
                this.setDataValue("email", value?.toLowerCase().trim());
            },
        },
        codeHash: { type: DataTypes.STRING, allowNull: false },
        purpose: { type: DataTypes.STRING, allowNull: false, defaultValue: "signup" },
        attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        expiresAt: { type: DataTypes.DATE, allowNull: false },
    },
    {
        sequelize,
        modelName: "Otp",
        tableName: "otps",
        timestamps: true,
        indexes: [{ fields: ["expiresAt"] }],
    }
);

// Postgres has no Mongo-style TTL index (expireAfterSeconds) to auto-delete
// expired docs — run this periodically (a cron/scheduled job) instead.
export async function purgeExpiredOtps() {
    const { Op } = await import("sequelize");
    return Otp.destroy({ where: { expiresAt: { [Op.lt]: new Date() } } });
}

export default Otp;