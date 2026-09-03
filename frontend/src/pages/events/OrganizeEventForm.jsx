import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Save,
  ArrowLeft,
  AlertCircle,
  Heart,
  Droplets,
  Plus,
  Truck,
  Apple,
  CheckCircle,
  XCircle,
  Link,
  DollarSign,
} from "lucide-react";

import "../../styles/event-styles/OrganizeEventForm.css";
import Navbar from "../../components/Navbar.jsx";
import { blockchainApi } from "../../utils/api.js";
import { removeToken } from "../../utils/auth.js";

// Event type mapping
const eventTypeMapping = {
  "health-checkup": "Free Health CheckUp",
  vaccination: "Vaccination Drive",
  "blood-donation": "Blood Donation Camp",
  "mobile-health": "Mobile Health Camp",
  nutrition: "Nutrition & Diet Camps",
  other: "Other",
};

// Persistent state hook
const usePersistentState = (key, initialValue) => {
  const [state, setState] = useState(() => {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
};

const OrganizeEventForm = () => {
  const navigate = useNavigate();
  const { eventType } = useParams();
  const location = useLocation();
  const eventTypeName = location.state?.eventTypeName || "Event";

  const [formData, setFormData] = usePersistentState("organizeFormData", {
    eventType: eventType,
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    locationURL: "",
    description: "",
    customEventName: "", // Added for "Other" event type
    donationNeeded: false, // Added for backend compatibility
    upiId: "", // Added for backend compatibility
  });

  const [loading, setLoading] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [status, setStatus] = useState(""); // success | failed | error
  const [errors, setErrors] = useState({});

  const eventIcons = {
    "health-checkup": <Heart className="icon blue" />,
    vaccination: <Plus className="icon green" />,
    "blood-donation": <Droplets className="icon red" />,
    "mobile-health": <Truck className="icon purple" />,
    nutrition: <Apple className="icon orange" />,
    other: <Calendar className="icon gray" />,
  };

  const isBloodDonation = eventType === "blood-donation";
  const isOtherEvent = eventType === "other";
  const role = localStorage.getItem("userRole");
  const canOrganize = ["ngo", "health_worker"].includes(role);

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
    const now = new Date();

    if (!formData.date) {
      newErrors.date = "Date is required";
    }
    if (!formData.startTime) {
      newErrors.startTime = "Start time is required";
    }
    if (!formData.endTime) {
      newErrors.endTime = "End time is required";
    }

    if (formData.date && formData.startTime && formData.endTime) {
      // Build start/end Date objects for comparison
      const eventDate = new Date(formData.date);

      const [sh, sm] = formData.startTime.split(":");
      const [eh, em] = formData.endTime.split(":");

      const startDateTime = new Date(eventDate);
      startDateTime.setHours(parseInt(sh), parseInt(sm), 0, 0);

      const endDateTime = new Date(eventDate);
      endDateTime.setHours(parseInt(eh), parseInt(em), 0, 0);

      // Past date not allowed
      if (startDateTime < now) {
        newErrors.date = "Event must be scheduled in the future";
      }

      // End time must be after start
      if (endDateTime <= startDateTime) {
        newErrors.endTime = "End time must be after start time";
      }
    }

    if (!formData.location.trim()) {
      newErrors.location = "Location is required";
    }
    if (!formData.locationURL.trim()) {
      newErrors.locationURL = "Location URL is required";
    }

    // Validate custom event name for "Other" type
    if (isOtherEvent && !formData.customEventName.trim()) {
      newErrors.customEventName = "Custom event name is required";
    }

    // Validate UPI ID if donations are needed
    if (formData.donationNeeded && !formData.upiId.trim()) {
      newErrors.upiId = "UPI ID is required when donations are needed";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      setStatus("");
      // Create date objects for start and end times
      const eventDate = new Date(formData.date);
      const [startHours, startMinutes] = formData.startTime.split(":");
      const [endHours, endMinutes] = formData.endTime.split(":");

      const startDateTime = new Date(eventDate);
      startDateTime.setHours(
        parseInt(startHours),
        parseInt(startMinutes),
        0,
        0
      );

      const endDateTime = new Date(eventDate);
      endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
      // Prepare data according to backend schema
      const backendData = {
        eventType: eventTypeMapping[eventType] || eventType,
        customEventName: isOtherEvent ? formData.customEventName : undefined,
        location: formData.location,
        locationURL: formData.locationURL,
        date: eventDate.toISOString(),
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        donationNeeded: formData.donationNeeded,
        upiId: formData.donationNeeded ? formData.upiId : undefined,
      };

      console.log("Sending data to backend:", backendData);

      const { data } = await blockchainApi.post("/organise/set", backendData);

      if (data.success) {
        setStatus("success");
        setPopupMessage("✅ Event created successfully!");
        setShowPopup(true);
        setTimeout(() => setShowPopup(false), 3000);

        // Clear form
        localStorage.removeItem("organizeFormData");
        navigate(`/events/${eventType}`);
      } else {
        setStatus("failed");
        setPopupMessage(data.error || "Failed to create event");
        setShowPopup(true);
        setTimeout(() => setShowPopup(false), 3000);
      }
    } catch (error) {
      console.error("Error creating event:", error);
      setStatus("error");
      setPopupMessage(
        error.response?.data?.error || "Something went wrong. Try again."
      );
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => navigate("/events");
  const handleLogout = () => {
    removeToken();
    navigate("/signin");
  };

  const getStatusIcon = () => {
    switch (status) {
      case "success":
        return <CheckCircle className="icon-success" />;
      case "failed":
      case "error":
        return <XCircle className="icon-failed" />;
      default:
        return null;
    }
  };

  if (!canOrganize) {
    return (
      <div className="page">
        <Navbar onLogout={handleLogout} />
        <div className="form-page">
          <div className="form-container">
            <div className="no-access">
              <h2>Not authorized</h2>
              <p>Only NGOs and Health Workers can organize events.</p>
              <button className="back-button" onClick={handleBack}>
                <ArrowLeft className="back-icon" /> Back to Events
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Navbar onLogout={handleLogout} />
      <div className="form-page">
        <div className="form-container">
          {/* Header */}
          <div className="header">
            <button onClick={handleBack} className="back-button">
              <ArrowLeft className="back-icon" /> Back to Events
            </button>
            <div className="title-container">
              {eventIcons[eventType]}
              <h1 className="title">Organize {eventTypeName}</h1>
            </div>
            {isBloodDonation && (
              <div className="blood-warning">
                <AlertCircle className="alert-icon" />
                <div>
                  <h3>Blood Donation Event</h3>
                  <p>
                    Participants will receive crypto rewards upon verification.
                    Ensure proper medical facilities and screening procedures
                    are in place.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Form */}
          <div className="form-card">
            <h2 className="section-title">Event Details</h2>
            <form onSubmit={handleSubmit} className="form-grid">
              {/* Custom Event Name for "Other" type */}
              {isOtherEvent && (
                <div className="form-field">
                  <label htmlFor="customEventName">
                    <Calendar className="label-icon" /> Custom Event Name *
                  </label>
                  <input
                    type="text"
                    id="customEventName"
                    name="customEventName"
                    value={formData.customEventName}
                    onChange={handleInputChange}
                    placeholder="Enter custom event name"
                    className={errors.customEventName ? "error" : ""}
                  />
                  {errors.customEventName && (
                    <p className="error-text">{errors.customEventName}</p>
                  )}
                </div>
              )}

              {/* Date & Time */}
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="date">
                    <Calendar className="label-icon" /> Event Date *
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className={errors.date ? "error" : ""}
                  />
                  {errors.date && <p className="error-text">{errors.date}</p>}
                </div>
                <div className="form-field">
                  <label htmlFor="startTime">
                    <Clock className="label-icon" /> Start Time *
                  </label>
                  <input
                    type="time"
                    id="startTime"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    className={errors.startTime ? "error" : ""}
                  />
                  {errors.startTime && (
                    <p className="error-text">{errors.startTime}</p>
                  )}
                </div>
                <div className="form-field">
                  <label htmlFor="endTime">
                    <Clock className="label-icon" /> End Time *
                  </label>
                  <input
                    type="time"
                    id="endTime"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    className={errors.endTime ? "error" : ""}
                  />
                  {errors.endTime && (
                    <p className="error-text">{errors.endTime}</p>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="form-field">
                <label htmlFor="location">
                  <MapPin className="label-icon" /> Location *
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Enter event location"
                  className={errors.location ? "error" : ""}
                />
                {errors.location && (
                  <p className="error-text">{errors.location}</p>
                )}
              </div>

              {/* Location URL */}
              <div className="form-field">
                <label htmlFor="locationURL">
                  <Link className="label-icon" /> Location URL *
                </label>
                <input
                  type="url"
                  id="locationURL"
                  name="locationURL"
                  value={formData.locationURL}
                  onChange={handleInputChange}
                  placeholder="https://maps.google.com/..."
                  className={errors.locationURL ? "error" : ""}
                />
                {errors.locationURL && (
                  <p className="error-text">{errors.locationURL}</p>
                )}
              </div>

              {/* Donation Section */}
              <div className="form-field">
                <div className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    id="donationNeeded"
                    name="donationNeeded"
                    checked={formData.donationNeeded}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="donationNeeded" className="checkbox-label">
                    <DollarSign className="label-icon" />
                    Accept donations for this event
                  </label>
                </div>
              </div>

              {/* UPI ID - only show if donations are needed */}
              {formData.donationNeeded && (
                <div className="form-field">
                  <label htmlFor="upiId">
                    <DollarSign className="label-icon" /> UPI ID *
                  </label>
                  <input
                    type="text"
                    id="upiId"
                    name="upiId"
                    value={formData.upiId}
                    onChange={handleInputChange}
                    placeholder="your-upi@paytm"
                    className={errors.upiId ? "error" : ""}
                  />
                  {errors.upiId && <p className="error-text">{errors.upiId}</p>}
                </div>
              )}

              {/* Submit */}
              <div className="submit-row">
                <button
                  type="submit"
                  disabled={loading}
                  className="submit-button"
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div> Creating Event...
                    </>
                  ) : (
                    <>
                      <Save className="btn-icon" /> Create Event
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Status */}
          {status && (
            <div className="status-card">
              <div className="status-header">
                {getStatusIcon()}
                <h3>Event Status</h3>
              </div>
              <p className={`status-message ${status}`}>{popupMessage}</p>
            </div>
          )}

          {/* Popup */}
          {showPopup && (
            <div
              style={{
                position: "fixed",
                top: "20px",
                right: "20px",
                background: status === "success" ? "#4caf50" : "#f44336",
                color: "white",
                padding: "12px 20px",
                borderRadius: "8px",
                boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                zIndex: 9999,
                fontSize: "16px",
                maxWidth: "300px",
              }}
            >
              {popupMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizeEventForm;
