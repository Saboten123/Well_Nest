import React, { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  User,
  Calendar,
  MapPin,
  ArrowLeft,
  AlertCircle,
  Clock,
} from "lucide-react";
import { blockchainApi } from "../../utils/api.js";
import "../../styles/event-styles/ParticipantRegistration.css";
import Navbar from "../../components/Navbar.jsx";

const ParticipantRegistration = () => {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const location = useLocation();
  const { eventDetails, onSuccess } = location.state || {};

  const [formData, setFormData] = useState({
    phone: "",
    medicalConditions: "",
    bloodType: "",
    age: "",
    consent: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const isBloodDonation = eventDetails?.eventType
    ?.toLowerCase()
    .includes("blood-donation");

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Phone validation (10–15 digits, optional +)
    const phoneRegex = /^\+?[0-9]{10,15}$/;

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number (10-15 digits)";
    }

    if (isBloodDonation) {
      if (!formData.bloodType) {
        newErrors.bloodType = "Blood type is required for blood donation";
      }
      if (formData.age < 15 || formData.age > 60) {
        newErrors.age = "Age must be between 18 and 60 for blood donation";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      // const token = localStorage.getItem("token");
      const { consent, ...participantData } = formData;
      const { data } = await blockchainApi.post("/part/register", {
        eventId: eventId,
        participantDetails: participantData,
      });

      if (data.success) {
        alert("Successfully registered for the event!");
        if (onSuccess) onSuccess();
        navigate(-1);
      } else {
        alert(data.error || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/signin");
  };

  return (
    <div className="page">
      <Navbar onLogout={handleLogout} />
      <div className="registration-container">
        <div className="registration-wrapper">
          {/* Header */}
          <div className="header">
            <button onClick={() => navigate(-1)} className="back-button">
              <ArrowLeft className="icon" />
              Back to Event
            </button>

            <h1 className="title">Event Registration</h1>

            {eventDetails && (
              <div className="event-summary">
                <h2 className="event-title">{eventDetails.eventTypeName}</h2>
                <div className="event-grid">
                  <div className="event-item">
                    <Calendar className="icon" />
                    {formatDate(eventDetails.date)}
                  </div>
                  <div className="event-item">
                    <User className="icon" />
                    Organized by {eventDetails.organizerName}
                  </div>
                  <div className="event-item">
                    <MapPin className="icon" />
                    <span>{eventDetails.location}</span>
                  </div>
                  <div className="event-item">
                    <Clock className="icon" />
                    {formatTime(eventDetails.startTime)} -{" "}
                    {formatTime(eventDetails.endTime)}
                  </div>
                </div>
              </div>
            )}

            {isBloodDonation && (
              <div className="blood-warning">
                <AlertCircle className="icon alert" />
                <div>
                  <h3>Blood Donation Event</h3>
                  <p>
                    You will receive crypto rewards upon successful
                    participation. Please ensure you meet the health
                    requirements for blood donation.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Registration Form */}
          <div className="form-box">
            <h3>Participant Information</h3>
            <form className="form" onSubmit={handleSubmit}>
              {/* Phone & Age */}
              <div className="form-grid">
                <div>
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                    className={errors.phone ? "input error" : "input"}
                  />
                  {errors.phone && <p className="error-text">{errors.phone}</p>}
                </div>
                <div>
                  <label>Age *</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="Enter your age"
                    className={errors.age ? "input error" : "input"}
                  />
                  {errors.age && <p className="error-text">{errors.age}</p>}
                </div>
              </div>

              {/* Blood Type */}
              {isBloodDonation && (
                <div>
                  <label>Blood Type *</label>
                  <select
                    name="bloodType"
                    value={formData.bloodType}
                    onChange={handleInputChange}
                    className={errors.bloodType ? "input error" : "input"}
                  >
                    <option value="">Select your blood type</option>
                    {bloodTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  {errors.bloodType && (
                    <p className="error-text">{errors.bloodType}</p>
                  )}
                </div>
              )}

              {/* Medical Conditions */}
              <div>
                <label>Medical Conditions (Optional)</label>
                <textarea
                  name="medicalConditions"
                  value={formData.medicalConditions}
                  onChange={handleInputChange}
                  rows="3"
                  className="textarea"
                />
              </div>

              {/* Consent */}
              <div className="consent-box">
                <input
                  type="checkbox"
                  name="consent"
                  checked={formData.consent}
                  onChange={handleInputChange}
                />
                <label>
                  <strong>Terms and Conditions *</strong>
                  <ul>
                    <li>I am participating voluntarily and at my own risk</li>
                    <li>I have disclosed all relevant medical information</li>
                    <li>I will follow all safety protocols during the event</li>
                    {isBloodDonation && (
                      <>
                        <li>
                          I meet the health requirements for blood donation
                        </li>
                        <li>I consent to the blood donation process</li>
                        <li>
                          I understand that rewards are only given upon
                          successful participation
                        </li>
                      </>
                    )}
                    <li>My information may be used for event management</li>
                  </ul>
                </label>
              </div>
              {errors.consent && <p className="error-text">{errors.consent}</p>}

              {/* Submit */}
              <div className="form-actions">
                <button type="submit" disabled={loading} className="submit-btn">
                  {loading ? "Registering..." : "Complete Registration"}
                </button>
              </div>
            </form>
          </div>

          {/* Info */}
          <div className="info-box">
            <h4>What to expect:</h4>
            <ul>
              <li>• Arrive 15 minutes before the scheduled time</li>
              <li>• Bring a valid ID proof</li>
              <li>• Follow all health and safety protocols</li>
              {isBloodDonation && (
                <>
                  <li>• Eat well before donation</li>
                  <li>• Stay hydrated and rest after donation</li>
                  <li>• Rewards will be credited after successful donation</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantRegistration;
