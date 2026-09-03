import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api.js";
import Navbar from "../components/Navbar.jsx";
import "../styles/AppointmentsPage.css";

export default function ScheduledAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [filter, setFilter] = useState("all"); // all, today, upcoming, past
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/signin");
      return;
    }
    fetchDoctorProfile();
  }, [navigate]);

  useEffect(() => {
    if (currentUser) {
      fetchAppointments();
    }
  }, [currentUser]);

  const fetchDoctorProfile = async () => {
    try {
      const res = await api.get("/doctor/profile");
      setCurrentUser(res?.data?.data || null);
    } catch (err) {
      console.error("Error fetching doctor profile:", err);
      setError("Access denied. Only doctors can view this page.");
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      if (!currentUser?._id) {
        setError("Access denied. Only doctors can view this page.");
        return;
      }
      const doctorId = currentUser._id;

      // Fetch both accepted and scheduled appointments
      const [acceptedResponse, scheduledResponse] = await Promise.all([
        api.get(
          `/appointment/get-doctor-appointment?doctorId=${doctorId}&status=accepted`
        ),
        api.get(
          `/appointment/get-doctor-appointment?doctorId=${doctorId}&status=scheduled`
        ),
      ]);

      const allAppointments = [
        ...(Array.isArray(acceptedResponse?.data?.data)
          ? acceptedResponse.data.data
          : []),
        ...(Array.isArray(scheduledResponse?.data?.data)
          ? scheduledResponse.data.data
          : []),
      ];

      setAppointments(allAppointments);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setError("Failed to fetch appointments");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/signin");
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
      try {
        const response = await api.patch(`/appointment/cancel`, {
          appointmentId,
        });

        if (response.data.success) {
          alert("Appointment cancelled successfully!");
          await fetchAppointments();
        }
      } catch (err) {
        console.error("Error cancelling appointment:", err);
        alert(err.response?.data?.message || "Failed to cancel appointment");
      }
    }
  };

  const handleRescheduleAppointment = async (appointment) => {
    const newTime = prompt(
      "Enter new date and time (YYYY-MM-DD HH:MM format):",
      appointment.scheduledTime
        ? new Date(appointment.scheduledTime)
            .toISOString()
            .slice(0, 16)
            .replace("T", " ")
        : new Date(appointment.requestedTime)
            .toISOString()
            .slice(0, 16)
            .replace("T", " ")
    );

    if (newTime) {
      try {
        const response = await api.patch("/appointment/change-time", {
          appointmentId: appointment._id,
          newTime: new Date(newTime.replace(" ", "T")).toISOString(),
          notes: "Rescheduled by doctor",
        });

        if (response.data.success) {
          alert("Appointment rescheduled successfully!");
          await fetchAppointments();
        }
      } catch (err) {
        console.error("Error rescheduling appointment:", err);
        alert(
          err.response?.data?.message || "Failed to reschedule appointment"
        );
      }
    }
  };

  const handleStartVideoCall = (appointment) => {
    // Set appointment context for video call
    localStorage.setItem(
      "currentAppointment",
      JSON.stringify({
        appointmentId: appointment._id,
        doctorId: appointment.doctorId?._id || currentUser._id,
        patientId: appointment.patientId?._id || appointment.patientId,
        doctorName: currentUser.name || "Doctor",
        patientName: appointment.patientId?.name || "Patient",
        userRole: "doctor",
      })
    );

    // Navigate to video call page
    navigate("/video-call");
  };

  const filterAppointments = (appointments) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    switch (filter) {
      case "today":
        return appointments.filter((appointment) => {
          const appointmentDate = new Date(
            appointment.scheduledTime || appointment.requestedTime
          );
          return appointmentDate >= today && appointmentDate < tomorrow;
        });
      case "upcoming":
        return appointments.filter((appointment) => {
          const appointmentDate = new Date(
            appointment.scheduledTime || appointment.requestedTime
          );
          return appointmentDate >= tomorrow;
        });
      case "past":
        return appointments.filter((appointment) => {
          const appointmentDate = new Date(
            appointment.scheduledTime || appointment.requestedTime
          );
          return appointmentDate < today;
        });
      default:
        return appointments;
    }
  };

  const filteredAppointments = filterAppointments(appointments);

  if (loading) {
    return (
      <div className="page">
        <Navbar onLogout={handleLogout} />
        <div className="page-content">
          <div className="section-header">
            <h1 className="section-title">Scheduled Appointments</h1>
            <p className="section-subtitle">
              View and manage your scheduled appointments
            </p>
          </div>
          <div className="section-content">
            <div className="loading-spinner"></div>
            <p>Loading appointments...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <Navbar onLogout={handleLogout} />
        <div className="page-content">
          <div className="section-header">
            <h1 className="section-title">Scheduled Appointments</h1>
            <p className="section-subtitle">
              View and manage your scheduled appointments
            </p>
          </div>
          <div className="section-content">
            <div className="error-message">{error}</div>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/doctors")}
            >
              Go Back to Doctors
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Navbar onLogout={handleLogout} />
      <div className="page-content">
        <div className="section-header">
          <h1 className="section-title">Scheduled Appointments</h1>
          <p className="section-subtitle">
            View and manage your scheduled appointments
          </p>
          <button
            className="btn btn-outline"
            onClick={() => navigate("/doctors")}
          >
            ← Back to Doctors
          </button>
        </div>

        <div className="section-content">
          {/* Filter Buttons */}
          <div className="appointment-filters">
            <button
              className={`btn btn-small ${
                filter === "all" ? "btn-primary" : "btn-outline"
              }`}
              onClick={() => setFilter("all")}
            >
              All ({appointments.length})
            </button>
            <button
              className={`btn btn-small ${
                filter === "today" ? "btn-primary" : "btn-outline"
              }`}
              onClick={() => setFilter("today")}
            >
              Today ({filterAppointments(appointments).length})
            </button>
            <button
              className={`btn btn-small ${
                filter === "upcoming" ? "btn-primary" : "btn-outline"
              }`}
              onClick={() => setFilter("upcoming")}
            >
              Upcoming ({filterAppointments(appointments).length})
            </button>
            <button
              className={`btn btn-small ${
                filter === "past" ? "btn-primary" : "btn-outline"
              }`}
              onClick={() => setFilter("past")}
            >
              Past ({filterAppointments(appointments).length})
            </button>
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <h3>
                No{" "}
                {filter === "all"
                  ? "Scheduled"
                  : filter.charAt(0).toUpperCase() + filter.slice(1)}{" "}
                Appointments
              </h3>
              <p>
                {filter === "all"
                  ? "You don't have any scheduled appointments at the moment."
                  : `You don't have any ${filter} appointments.`}
              </p>
            </div>
          ) : (
            <div className="appointments-grid">
              {filteredAppointments.map((appointment) => {
                const appointmentTime = new Date(
                  appointment.scheduledTime || appointment.requestedTime
                );
                const isPast = appointmentTime < new Date();
                const canVideoCall =
                  (appointment.status === "scheduled" ||
                    appointment.status === "accepted") &&
                  !isPast;

                return (
                  <div key={appointment._id} className="appointment-card-large">
                    <div className="appointment-header">
                      <h3>{appointment.patientId?.name || "Patient Name"}</h3>
                      <span
                        className={`status-badge status-${appointment.status}`}
                      >
                        {appointment.status}
                      </span>
                    </div>
                    <div className="appointment-details">
                      <div className="detail-row">
                        <strong>
                          {appointment.scheduledTime
                            ? "Scheduled Time:"
                            : "Requested Time:"}
                        </strong>
                        <span className={isPast ? "past-time" : "future-time"}>
                          {appointmentTime.toLocaleString()}
                          {isPast && " (Past)"}
                        </span>
                      </div>
                      <div className="detail-row">
                        <strong>Patient Email:</strong>
                        <span>
                          {appointment.patientId?.email || "Not provided"}
                        </span>
                      </div>
                      <div className="detail-row">
                        <strong>Patient Phone:</strong>
                        <span>
                          {appointment.patientId?.phone || "Not provided"}
                        </span>
                      </div>
                      <div className="detail-row">
                        <strong>Reason:</strong>
                        <span>
                          {appointment.reason || "No reason provided"}
                        </span>
                      </div>
                      {appointment.notes && (
                        <div className="detail-row">
                          <strong>Notes:</strong>
                          <span>{appointment.notes}</span>
                        </div>
                      )}
                      <div className="detail-row">
                        <strong>Booked:</strong>
                        <span>
                          {new Date(appointment.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="appointment-actions-large">
                      {!isPast && (
                        <>
                          <button
                            className="btn btn-secondary"
                            onClick={() =>
                              handleRescheduleAppointment(appointment)
                            }
                          >
                            Reschedule
                          </button>
                          <button
                            className="btn btn-outline"
                            onClick={() =>
                              handleCancelAppointment(appointment._id)
                            }
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {canVideoCall && (
                        <button
                          className="btn btn-primary video-call-btn"
                          onClick={() => handleStartVideoCall(appointment)}
                        >
                          📹 Start Video Call
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
