import React, { useState, useEffect } from "react";
import api from "../../utils/api.js";

export default function DoctorsSection() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await api.get("/doctors");
      setDoctors(response.data.data.items || []);
    } catch (err) {
      setError("Failed to fetch doctors");
      console.error("Error fetching doctors:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="section-header">
          <h1 className="section-title">Find Doctors</h1>
          <p className="section-subtitle">Connect with qualified healthcare professionals</p>
        </div>
        <div className="section-content">
          <div className="loading-spinner"></div>
          <p>Loading doctors...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="section-header">
          <h1 className="section-title">Find Doctors</h1>
          <p className="section-subtitle">Connect with qualified healthcare professionals</p>
        </div>
        <div className="section-content">
          <div className="error-message">{error}</div>
          <button className="btn btn-primary" onClick={fetchDoctors}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Find Doctors</h1>
        <p className="section-subtitle">Connect with qualified healthcare professionals in your area</p>
      </div>

      <div className="section-content">
        {doctors.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👨‍⚕️</div>
            <h3>No Doctors Available</h3>
            <p>Check back later for available healthcare professionals.</p>
          </div>
        ) : (
          <div className="grid-3">
            {doctors.map((doctor, index) => (
              <div key={doctor._id || index} className="card doctor-card">
                <div className="card-header">
                  <div className="card-icon">👨‍⚕️</div>
                  <h3 className="card-title">
                    {doctor.user ? `${doctor.user.firstName} ${doctor.user.lastName}` : doctor.name || "Dr. Name"}
                  </h3>
                </div>
                <div className="card-content">
                  <div className="doctor-info">
                    <div className="info-item">
                      <strong>Specialization:</strong>
                      <span>{doctor.specialisation || doctor.specialization || "General Medicine"}</span>
                    </div>
                    <div className="info-item">
                      <strong>Affiliation:</strong>
                      <span>{doctor.affiliation || "Hospital Name"}</span>
                    </div>
                    <div className="info-item">
                      <strong>Gender:</strong>
                      <span>{doctor.gender || "Not specified"}</span>
                    </div>
                    {doctor.fee && (
                      <div className="info-item">
                        <strong>Consultation Fee:</strong>
                        <span>${doctor.fee}</span>
                      </div>
                    )}
                    {doctor.licenseNo && (
                      <div className="info-item">
                        <strong>License:</strong>
                        <span>{doctor.licenseNo}</span>
                      </div>
                    )}
                  </div>
                  <div className="doctor-actions">
                    <button className="btn btn-primary btn-small">
                      Book Appointment
                    </button>
                    <button className="btn btn-outline btn-small">
                      View Profile
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
