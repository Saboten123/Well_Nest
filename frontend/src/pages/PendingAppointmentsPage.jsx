import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api.js";
import Navbar from "../components/Navbar.jsx";
import "../styles/AppointmentsPage.css";

export default function PendingAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [acceptForm, setAcceptForm] = useState({
    appointmentId: "",
    scheduledTime: "",
    notes: "",
  });
  const [showAcceptModal, setShowAcceptModal] = useState(false);
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
      const response = await api.get(
        `/appointment/get-doctor-appointment?doctorId=${doctorId}&status=pending`
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/signin");
  };

  const handleAcceptAppointment = (appointment) => {
    setAcceptForm({
      appointmentId: appointment._id,
      scheduledTime: appointment.requestedTime
        ? new Date(appointment.requestedTime).toISOString().slice(0, 16)
        : "",
      notes: "",
    });
    setShowAcceptModal(true);
  };

  const handleAcceptSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.patch("/appointment/accept", acceptForm);

      if (response.data.success) {
        alert("Appointment accepted successfully!");
        setShowAcceptModal(false);
        await fetchAppointments();
      }
    } catch (err) {
      console.error("Error accepting appointment:", err);
      alert(err.response?.data?.message || "Failed to accept appointment");
    }
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

  // Delete functionality removed per requirement

  const closeModal = () => {
    setShowAcceptModal(false);
  };

  if (loading) {
    return (
      <div className="page">
        <Navbar onLogout={handleLogout} />
        <div className="page-content">
          <div className="section-header">
            <h1 className="section-title">Pending Appointments</h1>
            <p className="section-subtitle">
              Manage your pending appointment requests
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
            <h1 className="section-title">Pending Appointments</h1>
            <p className="section-subtitle">
              Manage your pending appointment requests
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
          <h1 className="section-title">Pending Appointments</h1>
          <p className="section-subtitle">
            Manage your pending appointment requests
          </p>
          <button
            className="btn btn-outline"
            onClick={() => navigate("/doctors")}
          >
            ← Back to Doctors
          </button>
        </div>

        <div className="section-content">
          {appointments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <h3>No Pending Appointments</h3>
              <p>
                You don't have any pending appointment requests at the moment.
              </p>
            </div>
          ) : (
            <div className="appointments-grid">
              {appointments.map((appointment) => (
                <div key={appointment._id} className="appointment-card-large">
                  <div className="appointment-header">
                    <h3>{appointment.patientId?.name || "Patient Name"}</h3>
                    <span className="status-badge status-pending">Pending</span>
                  </div>
                  <div className="appointment-details">
                    <div className="detail-row">
                      <strong>Requested Time:</strong>
                      <span>
                        {new Date(appointment.requestedTime).toLocaleString()}
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
                      <span>{appointment.reason || "No reason provided"}</span>
                    </div>
                    <div className="detail-row">
                      <strong>Booked:</strong>
                      <span>
                        {new Date(appointment.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="appointment-actions-large">
                    <button
                      className="btn btn-primary"
                      onClick={() => handleAcceptAppointment(appointment)}
                    >
                      Accept Appointment
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => handleCancelAppointment(appointment._id)}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => {
                        // Store appointment data in localStorage for chat to access
                        localStorage.setItem('currentAppointment', JSON.stringify({
                          appointmentId: appointment._id,
                          doctorId: appointment.doctorId?._id || appointment.doctorId,
                          patientId: appointment.patientId?._id || appointment.patientId,
                          doctorName: appointment.doctorId?.name || "Doctor",
                          patientName: appointment.patientId?.name || "Patient"
                        }));
                        navigate(`/chat/${appointment._id}`);
                      }}
                    >
                      💬 Chat with Patient
                    </button>
                    {/* Delete action removed per requirement */}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Accept Appointment Modal */}
      {showAcceptModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Accept Appointment</h3>
              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAcceptSubmit}>
                <div className="form-group">
                  <label htmlFor="scheduledTime">Scheduled Time:</label>
                  <input
                    type="datetime-local"
                    id="scheduledTime"
                    value={acceptForm.scheduledTime}
                    onChange={(e) =>
                      setAcceptForm({
                        ...acceptForm,
                        scheduledTime: e.target.value,
                      })
                    }
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <small>Leave empty to use the requested time</small>
                </div>
                <div className="form-group">
                  <label htmlFor="notes">Notes (optional):</label>
                  <textarea
                    id="notes"
                    value={acceptForm.notes}
                    onChange={(e) =>
                      setAcceptForm({ ...acceptForm, notes: e.target.value })
                    }
                    placeholder="Add any notes for the patient..."
                    rows="3"
                  />
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn btn-primary">
                    Accept Appointment
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
