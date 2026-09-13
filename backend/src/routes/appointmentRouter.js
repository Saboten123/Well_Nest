import { Router } from "express";
import { Op } from "sequelize";
import Appointment from "../models/Appointments.js";
import DoctorProfile from "../models/DoctorProfile.js";
import PatientProfile from "../models/PatientProfile.js";
import User from "../models/User.js";
import { authRequired } from "../middlewares/auth.js";
import { restrictRole } from "../middlewares/restrict.js";
import { sendAppointmentRequestEmail, sendAppointmentScheduledEmail, sendAppointmentTimeChangedEmail, sendAppointmentCancelledEmail } from "../utils/mailer.js";

const router = Router();

router.use(authRequired);

// Book a new appointment
router.post("/book", async (req, res, next) => {
  console.log("set is called")
  try {
    const { doctorId, patientId, requestedTime, reason } = req.body;

    // Validate required fields
    if (!doctorId || !patientId || !requestedTime) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID, Patient ID, and requested time are required",
      });
    }

    // Check if the requested time slot is already taken
    const existingAppointment = await Appointment.findOne({
      where: { doctorId, requestedTime: new Date(requestedTime) },
    });

    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        message: "This time slot is already booked",
      });
    }

    const newAppointment = await Appointment.create({
      doctorId,
      patientId,
      requestedTime: new Date(requestedTime),
      reason,
      status: "pending",
    });

    // Notify the doctor by email. Failure to email should never fail the booking.
    try {
      const [doctorProfile, patientProfile] = await Promise.all([
        DoctorProfile.findByPk(doctorId, { include: [{ model: User, attributes: ["email"] }] }),
        PatientProfile.findByPk(patientId),
      ]);
      if (doctorProfile?.User?.email) {
        await sendAppointmentRequestEmail(doctorProfile.User.email, {
          patientName: patientProfile?.name,
          requestedTime: newAppointment.requestedTime,
          reason,
        });
      }
    } catch (emailErr) {
      console.error("Failed to send appointment request email:", emailErr);
    }

    res.status(201).json({
      success: true,
      message: "Appointment booked successfully",
      data: newAppointment,
    });
  } catch (error) {
    next(error);
  }
});

// Accept an appointment
router.patch("/accept", restrictRole(["doctor"]), async (req, res, next) => {
  try {
    const { appointmentId, scheduledTime, notes } = req.body;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: "Appointment ID is required",
      });
    }

    const appointment = await Appointment.findByPk(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (appointment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending appointments can be accepted",
      });
    }

    // Check if scheduled time conflicts with existing appointments
    if (scheduledTime) {
      const conflictingAppointment = await Appointment.findOne({
        where: {
          doctorId: appointment.doctorId,
          scheduledTime: new Date(scheduledTime),
          status: { [Op.in]: ["accepted", "scheduled"] },
          id: { [Op.ne]: appointmentId },
        },
      });

      if (conflictingAppointment) {
        return res.status(409).json({
          success: false,
          message: "The scheduled time conflicts with another appointment",
        });
      }
    }

    appointment.status = "accepted";
    appointment.scheduledTime = scheduledTime
      ? new Date(scheduledTime)
      : appointment.requestedTime;
    if (notes) appointment.notes = notes;

    await appointment.save();

    // Notify the patient by email. Failure to email should never fail the update.
    try {
      const [patientProfile, doctorProfile] = await Promise.all([
        PatientProfile.findByPk(appointment.patientId, { include: [{ model: User, attributes: ["email"] }] }),
        DoctorProfile.findByPk(appointment.doctorId),
      ]);
      if (patientProfile?.User?.email) {
        await sendAppointmentScheduledEmail(patientProfile.User.email, {
          doctorName: doctorProfile?.name,
          scheduledTime: appointment.scheduledTime,
        });
      }
    } catch (emailErr) {
      console.error("Failed to send appointment scheduled email:", emailErr);
    }

    res.json({
      success: true,
      message: "Appointment accepted successfully",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
});

// Change appointment time
router.patch(
  "/change-time",
  restrictRole(["doctor"]),
  async (req, res, next) => {
    try {
      const { appointmentId, newTime, notes } = req.body;

      if (!appointmentId || !newTime) {
        return res.status(400).json({
          success: false,
          message: "Appointment ID and new time are required",
        });
      }

      const appointment = await Appointment.findByPk(appointmentId);

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found",
        });
      }

      if (!["pending", "accepted", "scheduled"].includes(appointment.status)) {
        return res.status(400).json({
          success: false,
          message: "Cannot change time for this appointment status",
        });
      }

      // Check for time conflicts
      const conflictingAppointment = await Appointment.findOne({
        where: {
          doctorId: appointment.doctorId,
          [Op.or]: [
            { requestedTime: new Date(newTime) },
            { scheduledTime: new Date(newTime) },
          ],
          status: { [Op.in]: ["pending", "accepted", "scheduled"] },
          id: { [Op.ne]: appointmentId },
        },
      });

      if (conflictingAppointment) {
        return res.status(409).json({
          success: false,
          message: "The new time conflicts with another appointment",
        });
      }

      // Update the appropriate time field based on current status
      if (appointment.status === "pending") {
        appointment.requestedTime = new Date(newTime);
      } else {
        appointment.scheduledTime = new Date(newTime);
      }

      if (notes) appointment.notes = notes;

      await appointment.save();

      // Notify the patient of the new time. Failure to email should never fail the update.
      try {
        const [patientProfile, doctorProfile] = await Promise.all([
          PatientProfile.findByPk(appointment.patientId, { include: [{ model: User, attributes: ["email"] }] }),
          DoctorProfile.findByPk(appointment.doctorId),
        ]);
        if (patientProfile?.User?.email) {
          await sendAppointmentTimeChangedEmail(patientProfile.User.email, {
            doctorName: doctorProfile?.name,
            newTime: appointment.status === "pending" ? appointment.requestedTime : appointment.scheduledTime,
          });
        }
      } catch (emailErr) {
        console.error("Failed to send appointment time changed email:", emailErr);
      }

      res.json({
        success: true,
        message: "Appointment time changed successfully",
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get doctor's appointments (should be GET method)
router.get(
  "/get-doctor-appointment",
  restrictRole(["doctor"]),
  async (req, res, next) => {
    try {
      const { doctorId, status, page = 1, limit = 10 } = req.query;

      if (!doctorId) {
        return res.status(400).json({
          success: false,
          message: "Doctor ID is required",
        });
      }

      const where = { doctorId };
      if (status) where.status = status;

      const offset = (page - 1) * limit;

      const { rows: appointments, count: total } = await Appointment.findAndCountAll({
        where,
        include: [{ model: PatientProfile, attributes: ["name"], include: [{ model: User, attributes: ["email", "phone"] }] }],
        order: [["createdAt", "DESC"]],
        offset,
        limit: parseInt(limit),
      });

      res.json({
        success: true,
        data: appointments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalAppointments: total,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get patient's appointments (should be GET method)
router.get("/get-patient-appointment", async (req, res, next) => {
  try {
    const { patientId, status, page = 1, limit = 10 } = req.query;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Patient ID is required",
      });
    }

    const where = { patientId };
    if (status) where.status = status;

    const offset = (page - 1) * limit;

    const { rows: appointments, count: total } = await Appointment.findAndCountAll({
      where,
      include: [{ model: DoctorProfile, attributes: ["name", "specialization"], include: [{ model: User, attributes: ["email"] }] }],
      order: [["createdAt", "DESC"]],
      offset,
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: appointments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalAppointments: total,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Cancel an appointment
router.patch("/cancel", async (req, res, next) => {
  try {
    const { appointmentId, reason } = req.body;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: "Appointment ID is required",
      });
    }

    const appointment = await Appointment.findByPk(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check if appointment can be cancelled
    if (appointment.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Appointment is already cancelled",
      });
    }

    if (appointment.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel completed appointment",
      });
    }

    // Update appointment status
    appointment.status = "cancelled";
    if (reason) {
      appointment.notes = reason;
    }

    await appointment.save();

    // Notify the other party. Failure to email should never fail the cancellation.
    try {
      const [patientProfile, doctorProfile] = await Promise.all([
        PatientProfile.findByPk(appointment.patientId, { include: [{ model: User, attributes: ["email"] }] }),
        DoctorProfile.findByPk(appointment.doctorId, { include: [{ model: User, attributes: ["email"] }] }),
      ]);

      if (req.user.role === "doctor") {
        if (patientProfile?.User?.email) {
          await sendAppointmentCancelledEmail(patientProfile.User.email, {
            recipientRole: "patient",
            otherPartyName: doctorProfile?.name,
            reason,
          });
        }
      } else if (doctorProfile?.User?.email) {
        await sendAppointmentCancelledEmail(doctorProfile.User.email, {
          recipientRole: "doctor",
          otherPartyName: patientProfile?.name,
          reason,
        });
      }
    } catch (emailErr) {
      console.error("Failed to send appointment cancelled email:", emailErr);
    }

    res.json({
      success: true,
      message: "Appointment cancelled successfully",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
});

export default router;