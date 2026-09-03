import { Router } from "express";
import Appointment from "../models/Appointments.js"; // Adjust path as needed
import { authRequired } from "../middlewares/auth.js";
import { restrictRole } from "../middlewares/restrict.js";

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
      doctorId,
      requestedTime: new Date(requestedTime),
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
router.patch("/accept",restrictRole(["doctor"]), async (req, res, next) => {
  try {
    const { appointmentId, scheduledTime, notes } = req.body;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: "Appointment ID is required",
      });
    }

    const appointment = await Appointment.findById(appointmentId);

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
        doctorId: appointment.doctorId,
        scheduledTime: new Date(scheduledTime),
        status: { $in: ["accepted", "scheduled"] },
        _id: { $ne: appointmentId },
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

      const appointment = await Appointment.findById(appointmentId);

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
        doctorId: appointment.doctorId,
        $or: [
          { requestedTime: new Date(newTime) },
          { scheduledTime: new Date(newTime) },
        ],
        status: { $in: ["pending", "accepted", "scheduled"] },
        _id: { $ne: appointmentId },
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

      const query = { doctorId };
      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;

      const appointments = await Appointment.find(query)
        .populate("patientId", "name email phone") // Adjust fields based on your PatientProfile schema
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Appointment.countDocuments(query);

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

    const query = { patientId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const appointments = await Appointment.find(query)
      .populate("doctorId", "name specialization email") // Adjust fields based on your DoctorProfile schema
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(query);

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

// Add this route to your appointmentRouter.js file

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

    const appointment = await Appointment.findById(appointmentId);

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
      appointment.cancellationReason = reason;
    }
    appointment.cancelledAt = new Date();

    await appointment.save();

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
