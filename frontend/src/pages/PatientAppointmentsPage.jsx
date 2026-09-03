import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api.js";
import Navbar from "../components/Navbar.jsx";
import "../styles/AppointmentsPage.css";

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all | pending | accepted | scheduled | cancelled
  const [patientProfile, setPatientProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/signin");
      return;
    }
    fetchPatientProfile();
  }, [navigate]);

  useEffect(() => {
    if (patientProfile?._id) {
      fetchAppointments();
    }
  }, [patientProfile]);

  const fetchPatientProfile = async () => {
    try {
      const res = await api.get("/patient/profile");
      setPatientProfile(res?.data?.profile || res?.data?.data || null);
    } catch (err) {
      console.error("Error fetching patient profile:", err);
      setError("Please complete your patient profile to view appointments.");
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      query.set("patientId", patientProfile._id);
      if (filter !== "all") query.set("status", filter);
      const response = await api.get(
        `/appointment/get-patient-appointment?${query.toString()}`
      );
      const data = response?.data?.data || [];
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setError("Failed to fetch appointments");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (appointmentId) => {
    if (!appointmentId) return;
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      const res = await api.patch("/appointment/cancel", { appointmentId });
      if (res?.data?.success) {
        await fetchAppointments();
      }
    } catch (err) {
      console.error("Cancel failed:", err);
      alert(err?.response?.data?.message || "Failed to cancel appointment");
    }
  };

  const handleJoinVideoCall = (appointment) => {
    // Set appointment context for video call
    localStorage.setItem(
      "currentAppointment",
      JSON.stringify({
        appointmentId: appointment._id,
        doctorId: appointment.doctorId?._id || appointment.doctorId,
        patientId: appointment.patientId?._id || patientProfile._id,
        doctorName:
          appointment.doctorId?.name ||
          `${appointment.doctorId?.user?.firstName || "Doctor"} ${
            appointment.doctorId?.user?.lastName || ""
          }`,
        patientName: patientProfile.name || "Patient",
        userRole: "patient",
      })
    );

    // Navigate to video call page
    navigate("/video-call");
  };

  const statuses = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "accepted", label: "Accepted" },
    { key: "scheduled", label: "Scheduled" },
    { key: "cancelled", label: "Cancelled" },
  ];

  useEffect(() => {
    if (patientProfile?._id) fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  if (loading) {
    return (
      <div className="page">
        <Navbar
          onLogout={() => {
            localStorage.removeItem("token");
            navigate("/signin");
          }}
        />
        <div className="page-content">
          <div className="section-header">
            <h1 className="section-title">My Appointments</h1>
            <p className="section-subtitle">View your appointments</p>
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
        <Navbar
          onLogout={() => {
            localStorage.removeItem("token");
            navigate("/signin");
          }}
        />
        <div className="page-content">
          <div className="section-header">
            <h1 className="section-title">My Appointments</h1>
            <p className="section-subtitle">View your appointments</p>
          </div>
          <div className="section-content">
            <div className="error-message">{error}</div>
            <button
              className="btn btn-outline"
              onClick={() => navigate("/doctors")}
            >
              ← Back to Doctors
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Navbar
        onLogout={() => {
          localStorage.removeItem("token");
          navigate("/signin");
        }}
      />
      <div className="page-content">
        <div className="section-header">
          <h1 className="section-title">My Appointments</h1>
          <p className="section-subtitle">
            Track pending, accepted, scheduled and cancelled
          </p>
          <button
            className="btn btn-outline"
            onClick={() => navigate("/doctors")}
          >
            ← Back to Doctors
          </button>
        </div>

        <div className="appointment-filters">
          {statuses.map((s) => (
            <button
              key={s.key}
              className={`btn btn-small ${
                filter === s.key ? "btn-primary" : "btn-outline"
              }`}
              onClick={() => setFilter(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="section-content">
          {appointments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <h3>
                No{" "}
                {filter === "all" ? "appointments" : `${filter} appointments`}
              </h3>
              <p>New bookings will appear here.</p>
            </div>
          ) : (
            <div className="appointments-grid">
              {appointments.map((a) => {
                const appointmentTime = new Date(
                  a.scheduledTime || a.requestedTime
                );
                const isPast = appointmentTime < new Date();
                const canVideoCall =
                  (a.status === "scheduled" || a.status === "accepted") &&
                  !isPast;

                return (
                  <div key={a._id} className="appointment-card-large">
                    <div className="appointment-header">
                      <h3>
                        {a.doctorId?.name ||
                          `${a.doctorId?.user?.firstName || "Doctor"} ${
                            a.doctorId?.user?.lastName || ""
                          }`}
                      </h3>
                      <span className={`status-badge status-${a.status}`}>
                        {a.status}
                      </span>
                    </div>
                    <div className="appointment-details">
                      <div className="detail-row">
                        <strong>
                          {a.scheduledTime
                            ? "Scheduled Time:"
                            : "Requested Time:"}
                        </strong>
                        <span className={isPast ? "past-time" : "future-time"}>
                          {appointmentTime.toLocaleString()}
                          {isPast && " (Past)"}
                        </span>
                      </div>
                      {a.reason && (
                        <div className="detail-row">
                          <strong>Reason:</strong>
                          <span>{a.reason}</span>
                        </div>
                      )}
                      {a.notes && (
                        <div className="detail-row">
                          <strong>Doctor Notes:</strong>
                          <span>{a.notes}</span>
                        </div>
                      )}
                    </div>
                    <div className="appointment-actions-large">
                      {a.status !== "cancelled" && !isPast && (
                        <button
                          className="btn btn-outline"
                          onClick={() => handleCancel(a._id)}
                        >
                          Cancel
                        </button>
                      )}
                      {canVideoCall && (
                        <button
                          className="btn btn-primary video-call-btn"
                          onClick={() => handleJoinVideoCall(a)}
                        >
                          📹 Join Video Call
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
