// Central place for model associations — the Mongoose `ref`/`populate`
// setup from each schema now lives here as Sequelize associations, so
// controllers can do e.g. Appointment.findAll({ include: [DoctorProfile] })
// where they used to do .populate("doctorId").
import { sequelize } from "../config/db.js";
import { User } from "./User.js";
import { Otp } from "./Otp.js";
import { DoctorProfile } from "./DoctorProfile.js";
import { PatientProfile } from "./PatientProfile.js";
import { HealthWorkerProfile } from "./HealthWorkerProfile.js";
import { NGOProfile } from "./NGOProfile.js";
import { Appointment } from "./Appointments.js";
import { Chat } from "./Chats.js";
import { VideoCallSession } from "./videoCallSession.model.js";

User.hasOne(DoctorProfile, { foreignKey: "userId" });
DoctorProfile.belongsTo(User, { foreignKey: "userId" });

User.hasOne(PatientProfile, { foreignKey: "userId" });
PatientProfile.belongsTo(User, { foreignKey: "userId" });

User.hasOne(HealthWorkerProfile, { foreignKey: "userId" });
HealthWorkerProfile.belongsTo(User, { foreignKey: "userId" });

User.hasOne(NGOProfile, { foreignKey: "userId" });
NGOProfile.belongsTo(User, { foreignKey: "userId" });

DoctorProfile.hasMany(Appointment, { foreignKey: "doctorId" });
Appointment.belongsTo(DoctorProfile, { foreignKey: "doctorId" });

PatientProfile.hasMany(Appointment, { foreignKey: "patientId" });
Appointment.belongsTo(PatientProfile, { foreignKey: "patientId" });

Appointment.hasOne(Chat, { foreignKey: "appointmentId" });
Chat.belongsTo(Appointment, { foreignKey: "appointmentId" });

DoctorProfile.hasMany(Chat, { foreignKey: "doctorId" });
Chat.belongsTo(DoctorProfile, { foreignKey: "doctorId" });

PatientProfile.hasMany(Chat, { foreignKey: "patientId" });
Chat.belongsTo(PatientProfile, { foreignKey: "patientId" });

Appointment.hasMany(VideoCallSession, { foreignKey: "appointmentId" });
VideoCallSession.belongsTo(Appointment, { foreignKey: "appointmentId" });

export {
  sequelize,
  User,
  Otp,
  DoctorProfile,
  PatientProfile,
  HealthWorkerProfile,
  NGOProfile,
  Appointment,
  Chat,
  VideoCallSession,
};