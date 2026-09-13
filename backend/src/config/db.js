import { Sequelize } from "sequelize";

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  dialectOptions:
    process.env.NODE_ENV === "production"
      ? { ssl: { require: true, rejectUnauthorized: false } } // Render's managed Postgres requires SSL
      : {},
});

export async function connectDB() {
  await sequelize.authenticate();
  // Creates/updates tables from the model definitions. Swap for real
  // migrations before this ever holds production data.
  await sequelize.sync();
  console.log(" Postgres connected");
}