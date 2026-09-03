import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api.js";
import Navbar from "../components/Navbar.jsx";
import "../styles/DoctorsPage.css"; // Import the CSS file

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showAppointmentsModal, setShowAppointmentsModal] = useState(false);
  const [currentDoctorProfile, setCurrentDoctorProfile] = useState(null);
  const [myProfile, setMyProfile] = useState(null); // used for patientId when booking
  const [appointments, setAppointments] = useState([]);
  const [appointmentFilter, setAppointmentFilter] = useState("pending");
  const [bookingForm, setBookingForm] = useState({
    requestedTime: "",
    reason: "",
  });
  const [isBooking, setIsBooking] = useState(false);
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
    // Load self doctor profile (if logged-in user is a doctor)
    fetchSelfDoctorProfile();
    // Load generic current profile (used for patientId when booking as patient)
    fetchMyProfile();
    // Load public list of doctors
    fetchDoctors();
  }, [navigate]);

  const fetchSelfDoctorProfile = async () => {
    try {
      const response = await api.get("/doctor/profile");
      // success true and data is the profile
      setCurrentDoctorProfile(response.data.data);
    } catch (err) {
      // 404 means not a doctor or no profile; treat as non-doctor
      setCurrentDoctorProfile(null);
    }
  };

  const fetchMyProfile = async () => {
    try {
      // Prefer patient profile, since booking requires PatientProfile._id
      const res1 = await api.get("/patient/profile");
      if (res1?.data?.profile?._id) {
        setMyProfile(res1.data.profile);
        return;
      }
    } catch (_) {}
    try {
      // Fallback: generic profile (may not be patient)
      const response = await api.get("/profile/me");
      setMyProfile(response.data?.data?.profile || null);
    } catch (_) {
      setMyProfile(null);
    }
  };

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await api.get("/doctors");
      const payload = response?.data;
      let list = [];
      if (Array.isArray(payload)) {
        list = payload;
      } else if (Array.isArray(payload?.data?.items)) {
        list = payload.data.items;
      } else if (Array.isArray(payload?.data)) {
        list = payload.data;
      } else if (Array.isArray(payload?.doctors)) {
        list = payload.doctors;
      }
      setDoctors(list);
    } catch (err) {
      console.error("Error fetching doctors:", err);
      if (err.response) {
        setError(
          `Failed to fetch doctors: ${err.response.status} - ${
            err.response.data?.message || "Unknown error"
          }`
        );
      } else if (err.request) {
        setError("Failed to fetch doctors: No response from server");
      } else {
        setError(`Failed to fetch doctors: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async (doctorId, status = "pending") => {
    try {
      const id = String(doctorId || currentDoctorProfile?._id || "");
      if (!id) throw new Error("Missing doctor id for fetching appointments");
      const response = await api.get(
        `/appointment/get-doctor-appointment?doctorId=${encodeURIComponent(id)}&status=${encodeURIComponent(status)}`
      );
      setAppointments(response.data.data || []);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setError("Failed to fetch appointments");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/signin");
  };

  const formatAvailability = (availability) => {
    if (typeof availability === "string") {
      return availability;
    }
    if (typeof availability === "object" && availability !== null) {
      return Object.keys(availability).join(", ");
    }
    return "Not specified";
  };

  const isOwnDoctorProfile = (doctor) => {
    if (!currentDoctorProfile) return false;
    // Match by profile _id or referenced user id
    if (currentDoctorProfile._id && doctor._id) {
      return String(currentDoctorProfile._id) === String(doctor._id);
    }
    if (currentDoctorProfile.user && doctor.user) {
      return String(currentDoctorProfile.user._id || currentDoctorProfile.user) === String(
        doctor.user._id || doctor.user
      );
    }
    return false;
  };

  const handleViewProfile = (doctor) => {
    setSelectedDoctor(doctor);
    setShowProfileModal(true);
  };

  const handleBookAppointment = (doctor) => {
    setSelectedDoctor(doctor);
    setBookingForm({ requestedTime: "", reason: "" });
    setShowBookingModal(true);
  };

  const handleSeeAppointments = async (doctor) => {
    if (!doctor) return;
    setSelectedDoctor(doctor);
    await fetchAppointments(doctor._id || doctor.userId, appointmentFilter);
    setShowAppointmentsModal(true);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!myProfile?._id) {
        alert("Please complete your patient profile before booking an appointment.");
        return;
      }
      if (!bookingForm.requestedTime) {
        alert("Please pick a preferred date and time.");
        return;
      }
      setIsBooking(true);
      const requested = new Date(bookingForm.requestedTime);
      if (isNaN(requested.getTime())) {
        alert("Invalid date/time selected.");
        return;
      }
      // Format helpers
      const toIsoWithMs = (d) => d.toISOString();
      const withRandomSeconds = (base) => {
        const d = new Date(base);
        const sec = Math.floor(Math.random() * 58) + 1; // 1..59
        const ms = Math.floor(Math.random() * 900) + 10; // 10..909
        d.setSeconds(sec, ms);
        return d;
      };
      const toLocalInputString = (d) => {
        // yyyy-MM-ddTHH:mm matching datetime-local control
        const pad = (n) => String(n).padStart(2, "0");
        const yyyy = d.getFullYear();
        const MM = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const hh = pad(d.getHours());
        const mm = pad(d.getMinutes());
        return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
      };
      const doctorId = selectedDoctor._id; // must be DoctorProfile._id
      let requestedISO = toIsoWithMs(withRandomSeconds(requested));
      const baseData = {
        doctorId,
        patientId: myProfile?._id,
        reason: bookingForm.reason,
      };

      // Try sending the raw datetime-local string first (backend parses with new Date())
      const tryPostLocal = async (value) =>
        api.post("/appointment/book", { ...baseData, requestedTime: value });
      const tryPostIso = async (iso) =>
        api.post("/appointment/book", { ...baseData, requestedTime: iso });
      let response;
      let lastErr = null;
      // 1) Attempt with local string
      try {
        response = await tryPostLocal(bookingForm.requestedTime);
      } catch (e1) {
        lastErr = e1;
      }
      // 2) If failed, try with randomized ISO variants to dodge unique collisions
      const offsetsSec = [0, 61, 123, 187, 241, 19, 37, 89, 149, 211];
      if (!response) {
        for (let i = 0; i < offsetsSec.length; i++) {
          const iso = toIsoWithMs(
            withRandomSeconds(new Date(requested.getTime() + offsetsSec[i] * 1000))
          );
          try {
            response = await tryPostIso(iso);
            requestedISO = iso;
            break;
          } catch (err) {
            lastErr = err;
            const status = err?.response?.status;
            const raw = err?.response?.data;
            const rawStr = typeof raw === "string" ? raw : JSON.stringify(raw || {});
            const isDup = /E11000|duplicate key|duplicate/i.test(rawStr || "");
            const isConflict = status === 409;
            if (status === 400) break; // invalid payload; don't retry
            if (!(status === 500 && isDup) && !isConflict) break; // unknown error; stop
          }
        }
      }
      if (!response) throw lastErr || new Error("Booking failed");

      if (response.data.success) {
        alert("Appointment booked successfully!");
        setShowBookingModal(false);
        setBookingForm({ requestedTime: "", reason: "" });
      }
    } catch (err) {
      console.error("Error booking appointment:", err);
      const msg = err?.response?.data?.message || (typeof err?.response?.data === "string" ? err.response.data : null);
      if (err?.response?.status === 409) {
        alert(msg || "This time slot appears to be booked already. Please pick another time.");
      } else if (err?.response?.status === 400) {
        alert(msg || "Missing or invalid details. Please check and try again.");
      } else {
        const raw = err?.response?.data;
        const rawStr = typeof raw === "string" ? raw : JSON.stringify(raw || {});
        console.error("Book error payload:", rawStr);
        alert("Failed to book appointment. Please try a different time.");
      }
    } finally {
      setIsBooking(false);
    }
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
        await fetchAppointments(
          selectedDoctor._id || selectedDoctor.userId,
          appointmentFilter
        );
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
          await fetchAppointments(
            selectedDoctor._id || selectedDoctor.userId,
            appointmentFilter
          );
        }
      } catch (err) {
        console.error("Error cancelling appointment:", err);
        alert(err.response?.data?.message || "Failed to cancel appointment");
      }
    }
  };

  // Removed delete flow per requirement

  const closeModals = () => {
    setShowProfileModal(false);
    setShowBookingModal(false);
    setShowAppointmentsModal(false);
    setShowAcceptModal(false);
    setSelectedDoctor(null);
  };

  const handleAppointmentFilterChange = async (newFilter) => {
    setAppointmentFilter(newFilter);
    if (selectedDoctor) {
      await fetchAppointments(
        selectedDoctor._id || selectedDoctor.userId,
        newFilter
      );
    }
  };

  if (loading) {
    return (
      <div className="page">
        <Navbar onLogout={handleLogout} />
        <div className="page-content">
          <div className="section-header">
            <h1 className="section-title">Doctors</h1>
            <p className="section-subtitle">
              Find and connect with healthcare professionals
            </p>
          </div>
          <div className="section-content">
            <div className="loading-spinner"></div>
            <p>Loading doctors...</p>
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
            <h1 className="section-title">Doctors</h1>
            <p className="section-subtitle">
              Find and connect with healthcare professionals
            </p>
          </div>
          <div className="section-content">
            <div className="error-message">{error}</div>
            <button className="btn btn-primary" onClick={fetchDoctors}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Normalize doctors to an array to prevent runtime errors
  const doctorsArr = Array.isArray(doctors) ? doctors : [];
  // Separate logged-in doctor (own profile) and other doctors
  const currentUserDoctor = doctorsArr.find((doctor) => isOwnDoctorProfile(doctor));
  const myDoctor = currentDoctorProfile || currentUserDoctor || null;
  const otherDoctors = doctorsArr.filter((doctor) => !isOwnDoctorProfile(doctor));

  return (
    <div className="page">
      <Navbar onLogout={handleLogout} />
      <div className="page-content">
        {/* Top-right patient quick action */}
        {!currentDoctorProfile && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
            <button className="btn btn-outline" onClick={() => navigate("/my-appointments")}>
              My Appointments
            </button>
          </div>
        )}
        <div className="section-header">
          <h1 className="section-title">Doctors</h1>
          <p className="section-subtitle">
            Find and connect with healthcare professionals
          </p>
        </div>

        <div className="section-content">
          {/* Current User Doctor Card (if applicable) */}
          {myDoctor && (
            <div className="my-profile-section">
              <h2 className="section-subtitle">My Profile</h2>
              <div className="card doctor-card my-doctor-card">
                <div className="card-header">
                  <div className="card-icon">👨‍⚕️</div>
                  <h3 className="card-title">
                    {myDoctor.user
                      ? `${myDoctor.user.firstName} ${myDoctor.user.lastName}`
                      : myDoctor.name || "Dr. Name"}{" "}
                    (You)
                  </h3>
                </div>
                <div className="card-content">
                  <div className="doctor-info">
                    <div className="info-item">
                      <strong>Specialization:</strong>
                      <span>
                        {myDoctor.specialisation ||
                          myDoctor.specialization ||
                          "General Medicine"}
                      </span>
                    </div>
                    {myDoctor.affiliation && (
                      <div className="info-item">
                        <strong>Affiliation:</strong>
                        <span>{myDoctor.affiliation}</span>
                      </div>
                    )}
                    {myDoctor.fee && (
                      <div className="info-item">
                        <strong>Consultation Fee:</strong>
                        <span>₹{myDoctor.fee}</span>
                      </div>
                    )}
                  </div>
                  <div className="doctor-actions">
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => navigate("/pending-appointments")}
                    >
                      See Pending Appointments
                    </button>
                    <button
                      className="btn btn-outline btn-small"
                      onClick={() => navigate("/scheduled-appointments")}
                    >
                      See Scheduled Appointments
                    </button>
                    <button
                      className="btn btn-outline btn-small"
                      onClick={() => handleViewProfile(myDoctor)}
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other Doctors */}
          {otherDoctors.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👨‍⚕️</div>
              <h3>No Other Doctors Available</h3>
              <p>Check back later for available doctors.</p>
            </div>
          ) : (
            <div>
              {currentUserDoctor && (
                <h2 className="section-subtitle">Other Doctors</h2>
              )}
              <div className="grid-3">
                {otherDoctors.map((doctor, index) => (
                  <div key={doctor._id || index} className="card doctor-card">
                    <div className="card-header">
                      <div className="card-icon">👨‍⚕️</div>
                      <h3 className="card-title">
                        {doctor.user
                          ? `${doctor.user.firstName} ${doctor.user.lastName}`
                          : doctor.name || "Dr. Name"}
                      </h3>
                    </div>
                    <div className="card-content">
                      <div className="doctor-info">
                        <div className="info-item">
                          <strong>Specialization:</strong>
                          <span>
                            {doctor.specialisation ||
                              doctor.specialization ||
                              "General Medicine"}
                          </span>
                        </div>
                        {doctor.affiliation && (
                          <div className="info-item">
                            <strong>Affiliation:</strong>
                            <span>{doctor.affiliation}</span>
                          </div>
                        )}
                        {doctor.fee && (
                          <div className="info-item">
                            <strong>Consultation Fee:</strong>
                            <span>₹{doctor.fee}</span>
                          </div>
                        )}
                        {doctor.availability && (
                          <div className="info-item">
                            <strong>Availability:</strong>
                            <span>
                              {formatAvailability(doctor.availability)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="doctor-actions">
                        {/* Patients can book or view their own appointments */}
                        {!currentDoctorProfile && (
                          <button
                            className="btn btn-primary btn-small"
                            onClick={() => handleBookAppointment(doctor)}
                          >
                            Book Appointment
                          </button>
                        )}
                        <button
                          className="btn btn-outline btn-small"
                          onClick={() => handleViewProfile(doctor)}
                        >
                          View Profile
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Doctor Profile Modal */}
      {showProfileModal && selectedDoctor && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Doctor Profile</h3>
              <button className="modal-close" onClick={closeModals}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="doctor-profile">
                <div className="profile-header">
                  <div className="profile-avatar">👨‍⚕️</div>
                  <div className="profile-name">
                    <h2>
                      {selectedDoctor.user
                        ? `${selectedDoctor.user.firstName} ${selectedDoctor.user.lastName}`
                        : selectedDoctor.name || "Dr. Name"}
                    </h2>
                    <p className="profile-title">
                      {selectedDoctor.specialisation ||
                        selectedDoctor.specialization ||
                        "General Medicine"}
                    </p>
                  </div>
                </div>

                <div className="profile-details">
                  <div className="detail-section">
                    <h4>Professional Information</h4>
                    <div className="detail-grid">
                      {selectedDoctor.licenseNumber && (
                        <div className="detail-item">
                          <strong>License Number:</strong>
                          <span>{selectedDoctor.licenseNumber}</span>
                        </div>
                      )}
                      {selectedDoctor.affiliation && (
                        <div className="detail-item">
                          <strong>Affiliation:</strong>
                          <span>{selectedDoctor.affiliation}</span>
                        </div>
                      )}
                      {selectedDoctor.gender && (
                        <div className="detail-item">
                          <strong>Gender:</strong>
                          <span>{selectedDoctor.gender}</span>
                        </div>
                      )}
                      {selectedDoctor.fee && (
                        <div className="detail-item">
                          <strong>Consultation Fee:</strong>
                          <span>₹{selectedDoctor.fee}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedDoctor.availability && (
                    <div className="detail-section">
                      <h4>Availability</h4>
                      <div className="availability-display">
                        {typeof selectedDoctor.availability === "object" ? (
                          <div className="availability-grid">
                            {Object.entries(selectedDoctor.availability).map(
                              ([day, available]) => (
                                <div
                                  key={day}
                                  className={`availability-day ${
                                    available ? "available" : "unavailable"
                                  }`}
                                >
                                  <span className="day-name">
                                    {day.toUpperCase()}
                                  </span>
                                  <span className="day-status">
                                    {available ? "✓" : "✗"}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <p>{selectedDoctor.availability}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedDoctor.about && (
                    <div className="detail-section">
                      <h4>About</h4>
                      <p>{selectedDoctor.about}</p>
                    </div>
                  )}

                  {selectedDoctor.experience && (
                    <div className="detail-section">
                      <h4>Experience</h4>
                      <p>{selectedDoctor.experience}</p>
                    </div>
                  )}
                </div>

                <div className="profile-actions">
                  {!isOwnDoctorProfile(selectedDoctor) && (
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        closeModals();
                        handleBookAppointment(selectedDoctor);
                      }}
                    >
                      Book Appointment
                    </button>
                  )}
                  <button className="btn btn-outline" onClick={closeModals}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Book Appointment Modal */}
      {showBookingModal && selectedDoctor && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                Book Appointment with{" "}
                {selectedDoctor.user
                  ? `Dr. ${selectedDoctor.user.firstName} ${selectedDoctor.user.lastName}`
                  : selectedDoctor.name}
              </h3>
              <button className="modal-close" onClick={closeModals}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleBookingSubmit}>
                <div className="form-group">
                  <label htmlFor="requestedTime">Preferred Date & Time:</label>
                  <input
                    type="datetime-local"
                    id="requestedTime"
                    value={bookingForm.requestedTime}
                    onChange={(e) =>
                      setBookingForm({
                        ...bookingForm,
                        requestedTime: e.target.value,
                      })
                    }
                    required
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="reason">Reason for Visit:</label>
                  <textarea
                    id="reason"
                    value={bookingForm.reason}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, reason: e.target.value })
                    }
                    placeholder="Briefly describe your health concern..."
                    rows="4"
                  />
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn btn-primary" disabled={isBooking}>
                    {isBooking ? "Booking..." : "Book Appointment"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={closeModals}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Appointments Modal */}
      {showAppointmentsModal && selectedDoctor && (
        <div className="modal-overlay" onClick={closeModals}>
          <div
            className="modal-content modal-large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>My Appointments</h3>
              <button className="modal-close" onClick={closeModals}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="appointment-filters">
                <button
                  className={`btn btn-small ${
                    appointmentFilter === "pending"
                      ? "btn-primary"
                      : "btn-outline"
                  }`}
                  onClick={() => handleAppointmentFilterChange("pending")}
                >
                  Pending
                </button>
                <button
                  className={`btn btn-small ${
                    appointmentFilter === "accepted"
                      ? "btn-primary"
                      : "btn-outline"
                  }`}
                  onClick={() => handleAppointmentFilterChange("accepted")}
                >
                  Accepted
                </button>
                <button
                  className={`btn btn-small ${
                    appointmentFilter === "scheduled"
                      ? "btn-primary"
                      : "btn-outline"
                  }`}
                  onClick={() => handleAppointmentFilterChange("scheduled")}
                >
                  Scheduled
                </button>
              </div>

              <div className="appointments-list">
                {appointments.length === 0 ? (
                  <div className="empty-state">
                    <p>No {appointmentFilter} appointments found.</p>
                  </div>
                ) : (
                  appointments.map((appointment) => (
                    <div key={appointment._id} className="appointment-card">
                      <div className="appointment-info">
                        <h4>{appointment.patientId?.name || "Patient Name"}</h4>
                        <p>
                          <strong>Requested Time:</strong>{" "}
                          {new Date(appointment.requestedTime).toLocaleString()}
                        </p>
                        {appointment.scheduledTime && (
                          <p>
                            <strong>Scheduled Time:</strong>{" "}
                            {new Date(
                              appointment.scheduledTime
                            ).toLocaleString()}
                          </p>
                        )}
                        <p>
                          <strong>Reason:</strong>{" "}
                          {appointment.reason || "No reason provided"}
                        </p>
                        <p>
                          <strong>Status:</strong>{" "}
                          <span className={`status-${appointment.status}`}>
                            {appointment.status}
                          </span>
                        </p>
                        {appointment.notes && (
                          <p>
                            <strong>Notes:</strong> {appointment.notes}
                          </p>
                        )}
                      </div>
                      <div className="appointment-actions">
                        {appointment.status === "pending" && (
                          <button
                            className="btn btn-primary btn-small"
                            onClick={() => handleAcceptAppointment(appointment)}
                          >
                            Accept
                          </button>
                        )}
                        <button
                          className="btn btn-outline btn-small"
                          onClick={() =>
                            handleCancelAppointment(appointment._id)
                          }
                        >
                          Cancel
                        </button>
                        {/* Delete action removed per requirement */}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accept Appointment Modal */}
      {showAcceptModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Accept Appointment</h3>
              <button className="modal-close" onClick={closeModals}>
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
                    onClick={closeModals}
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
