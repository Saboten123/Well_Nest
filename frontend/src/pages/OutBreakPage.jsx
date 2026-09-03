import React, { useState, useEffect } from "react";
import {
  Plus,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  X,
  Map,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import api, { blockchainApi } from "../utils/api.js";
import { getToken, removeToken } from "../utils/auth.js";
import "../styles/OutbreakDashboard.css";

// Leaflet Map Component
const LeafletMap = ({
  center = [20.5937, 78.9629], // Center of India
  zoom = 5,
  onLocationSelect,
  selectedLocation,
  height = "300px",
  interactive = true,
}) => {
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const mapRef = React.useRef(null);

  useEffect(() => {
    // Load Leaflet CSS and JS
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href =
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.css";
      document.head.appendChild(link);
    }

    const loadLeaflet = async () => {
      if (window.L) {
        initializeMap();
        return;
      }

      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.js";
      script.onload = initializeMap;
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (mapRef.current && window.L && !map) {
        const newMap = window.L.map(mapRef.current).setView(center, zoom);

        window.L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution: "© OpenStreetMap contributors",
          }
        ).addTo(newMap);

        if (interactive && onLocationSelect) {
          newMap.on("click", (e) => {
            const { lat, lng } = e.latlng;

            // Remove existing marker
            if (marker) {
              newMap.removeLayer(marker);
            }

            // Add new marker
            const newMarker = window.L.marker([lat, lng]).addTo(newMap);
            setMarker(newMarker);

            // Reverse geocoding to get address
            fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
            )
              .then((response) => response.json())
              .then((data) => {
                const address = data.address || {};
                const locationData = {
                  latitude: lat,
                  longitude: lng,
                  address: data.display_name || "",
                  state: address.state || "",
                  district: address.state_district || address.county || "",
                  pincode: address.postcode || "",
                  country: address.country || "India",
                };
                onLocationSelect(locationData);
              })
              .catch((error) => {
                console.error("Error in reverse geocoding:", error);
                onLocationSelect({
                  latitude: lat,
                  longitude: lng,
                  address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                  state: "",
                  district: "",
                  pincode: "",
                  country: "India",
                });
              });
          });
        }

        // If there's a selected location, show marker
        if (
          selectedLocation &&
          selectedLocation.latitude &&
          selectedLocation.longitude
        ) {
          const existingMarker = window.L.marker([
            selectedLocation.latitude,
            selectedLocation.longitude,
          ]).addTo(newMap);
          setMarker(existingMarker);
          newMap.setView(
            [selectedLocation.latitude, selectedLocation.longitude],
            10
          );
        }

        setMap(newMap);
      }
    };

    loadLeaflet();

    return () => {
      if (map) {
        map.remove();
        setMap(null);
      }
    };
  }, []);

  useEffect(() => {
    if (
      map &&
      selectedLocation &&
      selectedLocation.latitude &&
      selectedLocation.longitude
    ) {
      // Remove existing marker
      if (marker) {
        map.removeLayer(marker);
      }

      // Add new marker
      const newMarker = window.L.marker([
        selectedLocation.latitude,
        selectedLocation.longitude,
      ]).addTo(map);
      setMarker(newMarker);
      map.setView([selectedLocation.latitude, selectedLocation.longitude], 10);
    }
  }, [selectedLocation, map]);

  return (
    <div
      ref={mapRef}
      style={{
        height,
        width: "100%",
        borderRadius: "8px",
        border: "1px solid #ddd",
      }}
      className="leaflet-map"
    />
  );
};

// Constants
const DISEASE_CATEGORIES = [
  "respiratory",
  "gastrointestinal",
  "vector_borne",
  "waterborne",
  "foodborne",
  "skin",
  "neurological",
  "other",
];

const REPORT_TYPES = ["outbreak", "health_survey", "emergency"];
const SEVERITY_LEVELS = ["low", "moderate", "high", "critical"];

// API service using axios
const outbreakApi = {
  getAllReports: async (params = {}) => {
    try {
      const response = await blockchainApi.get("/outbreak/country/india", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching reports:", error);
      throw error;
    }
  },

  submitReport: async (formData) => {
    try {
      // Convert FormData to the exact structure the backend expects
      const reportData = {
        submittedBy: {
          name: formData.get("submittedBy[name]"),
          email: formData.get("submittedBy[email]"),
          phoneNumber: formData.get("submittedBy[phoneNumber]") || "",
        },
        location: {
          country: formData.get("location[country]"),
          state: formData.get("location[state]"),
          district: formData.get("location[district]"),
          pincode: formData.get("location[pincode]") || "",
          address: formData.get("location[address]") || "",
          latitude: parseFloat(formData.get("location[latitude]")) || null,
          longitude: parseFloat(formData.get("location[longitude]")) || null,
        },
        descriptionComponents: {
          reportType: formData.get("descriptionComponents[reportType]"),
          diseaseCategory: formData.get(
            "descriptionComponents[diseaseCategory]"
          ),
          suspectedCases: parseInt(
            formData.get("descriptionComponents[suspectedCases]")
          ),
          basicInfo: formData.get("descriptionComponents[basicInfo]") || "",
          symptoms: formData.get("descriptionComponents[symptoms]") || "",
          additionalNotes:
            formData.get("descriptionComponents[additionalNotes]") || "",
        },
        severity: formData.get("severity"),
      };

      // Create a new FormData with the correct structure
      const newFormData = new FormData();

      // Add the structured data as JSON
      newFormData.append("submittedBy", JSON.stringify(reportData.submittedBy));
      newFormData.append("location", JSON.stringify(reportData.location));
      newFormData.append(
        "descriptionComponents",
        JSON.stringify(reportData.descriptionComponents)
      );
      newFormData.append("severity", reportData.severity);

      // Add images
      for (let i = 0; i < formData.getAll("images").length; i++) {
        newFormData.append("images", formData.getAll("images")[i]);
      }

      const response = await blockchainApi.post(
        "/outbreak/submit-public",
        newFormData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error submitting report:", error);
      throw error;
    }
  },

  verifyReport: async (reportId) => {
    try {
      const response = await blockchainApi.patch(
        `/outbreak/verify/${reportId}`,
        {}, // Empty body since backend gets userId from auth token
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error verifying report:", error);
      throw error;
    }
  },

  toggleReportStatus: async (reportId) => {
    try {
      const response = await blockchainApi.patch(
        `/outbreak/toggle-status/${reportId}`
      );
      return response.data;
    } catch (error) {
      console.error("Error toggling report status:", error);
      throw error;
    }
  },
};

// User API for getting current user info
const userApi = {
  getCurrentUser: async () => {
    try {
      const response = await api.get("/auth/me");
      return response.data;
    } catch (error) {
      console.error("Error fetching user info:", error);
      throw error;
    }
  },
};

// Utility functions
const getSeverityColor = (severity) => {
  const colors = {
    low: "severity-low",
    moderate: "severity-moderate",
    high: "severity-high",
    critical: "severity-critical",
  };
  return colors[severity] || "severity-default";
};

const isRecentReport = (createdAt) => {
  const reportDate = new Date(createdAt);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return reportDate >= sevenDaysAgo;
};

const getRoleDisplayName = (role) => {
  const roleNames = {
    public: "Public User",
    ngo: "NGO Worker",
    health_worker: "Health Worker",
    doctor: "Doctor",
    patient: "Patient",
  };
  return roleNames[role] || "Public User";
};

// Report Card Component
const ReportCard = ({
  report,
  userRole,
  onVerify,
  onToggleStatus,
  isAuthenticated,
}) => {
  const canManageReports =
    (userRole === "ngo" || userRole === "health_worker") && isAuthenticated;

  return (
    <div className="report-card">
      <div className="report-header">
        <div className="report-info">
          <div className="report-badges">
            <span
              className={`severity-badge ${getSeverityColor(report.severity)}`}
            >
              {report.severity.toUpperCase()}
            </span>
            {!report.isActive && (
              <span className="inactive-badge">INACTIVE</span>
            )}
            <span className="type-badge">
              {report.descriptionComponents.reportType
                .replace("_", " ")
                .toUpperCase()}
            </span>
          </div>
          <h3 className="report-title">
            {report.descriptionComponents.diseaseCategory.replace("_", " ")}{" "}
            Outbreak
          </h3>
          <div className="report-location">
            <MapPin className="location-icon" />
            {report.location.district}, {report.location.state},{" "}
            {report.location.country}
          </div>
          <div className="report-date">
            <Calendar className="date-icon" />
            {new Date(report.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* Action buttons for authorized users */}
        {canManageReports && (
          <div className="action-buttons">
            {!report.verifiedBy && (
              <button
                onClick={() => onVerify(report.id)}
                className="verify-btn"
              >
                <CheckCircle className="btn-icon" />
                Verify
              </button>
            )}
            <button
              onClick={() => onToggleStatus(report.id)}
              className={`toggle-btn ${
                report.isActive ? "deactivate" : "activate"
              }`}
            >
              {report.isActive ? (
                <XCircle className="btn-icon" />
              ) : (
                <CheckCircle className="btn-icon" />
              )}
              {report.isActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        )}
      </div>

      <div className="report-details">
        <div>
          <p className="detail-label">Suspected Cases</p>
          <p className="detail-value">
            {report.descriptionComponents.suspectedCases}
          </p>
        </div>
        <div>
          <p className="detail-label">Reported By</p>
          <p className="detail-value">{report.submittedBy.name}</p>
        </div>
      </div>

      {/* Location Map Display */}
      {report.location.latitude && report.location.longitude && (
        <div className="map-section">
          <p className="section-label">
            <Map className="section-icon" />
            Location
          </p>
          <LeafletMap
            center={[report.location.latitude, report.location.longitude]}
            zoom={12}
            selectedLocation={{
              latitude: report.location.latitude,
              longitude: report.location.longitude,
            }}
            interactive={false}
            height="200px"
          />
          {report.location.address && (
            <p className="address-text">{report.location.address}</p>
          )}
        </div>
      )}

      {report.descriptionComponents.symptoms && (
        <div className="symptoms-section">
          <p className="section-label">Symptoms</p>
          <p className="section-content">
            {report.descriptionComponents.symptoms}
          </p>
        </div>
      )}

      {report.images && report.images.length > 0 && (
        <div className="images-section">
          <p className="section-label">Evidence Images</p>
          <div className="images-grid">
            {report.images.map((image, idx) => (
              <img
                key={idx}
                src={`http://localhost:8000${image}`}
                alt={`Evidence ${idx + 1}`}
                className="evidence-image"
              />
            ))}
          </div>
        </div>
      )}

      {report.verifiedBy && (
        <div className="verified-section">
          <CheckCircle className="verified-icon" />
          <span className="verified-text">Verified</span>
        </div>
      )}
    </div>
  );
};

// Submit Report Form Component
const SubmitReportForm = ({
  showForm,
  setShowForm,
  formData,
  setFormData,
  selectedImages,
  setSelectedImages,
  onSubmit,
  loading,
}) => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showLocationSelector, setShowLocationSelector] = useState(false);

  useEffect(() => {
    if (formData.location.latitude && formData.location.longitude) {
      setSelectedLocation({
        latitude: formData.location.latitude,
        longitude: formData.longitude,
      });
    }
  }, [formData.location]);

  const handleLocationSelect = (locationData) => {
    setSelectedLocation(locationData);
    setFormData({
      ...formData,
      location: {
        ...formData.location,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        address: locationData.address,
        state: locationData.state || formData.location.state,
        district: locationData.district || formData.location.district,
        pincode: locationData.pincode || formData.location.pincode,
      },
    });
  };

  if (!showForm) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Submit Outbreak Report</h2>
          <button onClick={() => setShowForm(false)} className="close-btn">
            <X className="close-icon" />
          </button>
        </div>

        <div className="form-content">
          {/* Personal Information */}
          <div className="form-section">
            <h3 className="section-title">Personal Information</h3>
            <div className="form-grid-3">
              <input
                type="text"
                placeholder="Full Name"
                required
                className="form-input"
                value={formData.submittedBy.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    submittedBy: {
                      ...formData.submittedBy,
                      name: e.target.value,
                    },
                  })
                }
              />
              <input
                type="email"
                placeholder="Email"
                required
                className="form-input"
                value={formData.submittedBy.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    submittedBy: {
                      ...formData.submittedBy,
                      email: e.target.value,
                    },
                  })
                }
              />
              <input
                type="tel"
                placeholder="Phone Number"
                className="form-input"
                value={formData.submittedBy.phoneNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    submittedBy: {
                      ...formData.submittedBy,
                      phoneNumber: e.target.value,
                    },
                  })
                }
              />
            </div>
          </div>

          {/* Location Information */}
          <div className="form-section">
            <h3 className="section-title">
              <Map className="section-icon" />
              Location Information
            </h3>

            {/* Location Selector Toggle */}
            <div className="location-selector-header">
              <button
                type="button"
                onClick={() => setShowLocationSelector(!showLocationSelector)}
                className="location-toggle-btn"
              >
                <MapPin className="btn-icon" />
                {showLocationSelector ? "Hide Map" : "Select Location on Map"}
              </button>
              {selectedLocation && (
                <span className="location-selected-indicator">
                  Location Selected: {selectedLocation.latitude?.toFixed(4)},{" "}
                  {selectedLocation.longitude?.toFixed(4)}
                </span>
              )}
            </div>

            {/* Interactive Map */}
            {showLocationSelector && (
              <div className="map-container">
                <p className="map-instruction">
                  Click on the map to select the outbreak location
                </p>
                <LeafletMap
                  onLocationSelect={handleLocationSelect}
                  selectedLocation={selectedLocation}
                  height="400px"
                  interactive={true}
                />
              </div>
            )}

            {/* Manual Location Inputs */}
            <div className="form-grid-4">
              <input
                type="text"
                placeholder="State"
                required
                className="form-input"
                value={formData.location.state}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: {
                      ...formData.location,
                      state: e.target.value,
                    },
                  })
                }
              />
              <input
                type="text"
                placeholder="District"
                required
                className="form-input"
                value={formData.location.district}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: {
                      ...formData.location,
                      district: e.target.value,
                    },
                  })
                }
              />
              <input
                type="text"
                placeholder="Pincode"
                className="form-input"
                value={formData.location.pincode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: {
                      ...formData.location,
                      pincode: e.target.value,
                    },
                  })
                }
              />
              <input
                type="text"
                placeholder="Full Address"
                className="form-input"
                value={formData.location.address}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: {
                      ...formData.location,
                      address: e.target.value,
                    },
                  })
                }
              />
            </div>
          </div>

          {/* Report Details */}
          <div className="form-section">
            <h3 className="section-title">Report Details</h3>
            <div className="form-grid-4">
              <select
                required
                className="form-select"
                value={formData.descriptionComponents.reportType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    descriptionComponents: {
                      ...formData.descriptionComponents,
                      reportType: e.target.value,
                    },
                  })
                }
              >
                {REPORT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace("_", " ").charAt(0).toUpperCase() +
                      type.replace("_", " ").slice(1)}
                  </option>
                ))}
              </select>
              <select
                required
                className="form-select"
                value={formData.descriptionComponents.diseaseCategory}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    descriptionComponents: {
                      ...formData.descriptionComponents,
                      diseaseCategory: e.target.value,
                    },
                  })
                }
              >
                <option value="">Select Disease Category</option>
                {DISEASE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category.replace("_", " ").charAt(0).toUpperCase() +
                      category.replace("_", " ").slice(1)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Suspected Cases"
                min="0"
                required
                className="form-input"
                value={formData.descriptionComponents.suspectedCases}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    descriptionComponents: {
                      ...formData.descriptionComponents,
                      suspectedCases: parseInt(e.target.value) || 0,
                    },
                  })
                }
              />
              <select
                required
                className="form-select"
                value={formData.severity}
                onChange={(e) =>
                  setFormData({ ...formData, severity: e.target.value })
                }
              >
                {SEVERITY_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-textareas">
              <textarea
                placeholder="Basic Information"
                className="form-textarea"
                rows="3"
                value={formData.descriptionComponents.basicInfo}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    descriptionComponents: {
                      ...formData.descriptionComponents,
                      basicInfo: e.target.value,
                    },
                  })
                }
              />
              <textarea
                placeholder="Symptoms"
                className="form-textarea"
                rows="3"
                value={formData.descriptionComponents.symptoms}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    descriptionComponents: {
                      ...formData.descriptionComponents,
                      symptoms: e.target.value,
                    },
                  })
                }
              />
              <textarea
                placeholder="Additional Notes"
                className="form-textarea"
                rows="3"
                value={formData.descriptionComponents.additionalNotes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    descriptionComponents: {
                      ...formData.descriptionComponents,
                      additionalNotes: e.target.value,
                    },
                  })
                }
              />
            </div>
          </div>

          {/* Image Upload */}
          <div className="form-section">
            <h3 className="section-title">Evidence Images (Optional)</h3>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setSelectedImages(Array.from(e.target.files))}
              className="file-input"
            />
            {selectedImages.length > 0 && (
              <p className="file-info">
                {selectedImages.length} image(s) selected
              </p>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="cancel-btn"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading}
              className="submit-btn"
            >
              {loading ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
const OutbreakDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("reports");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState("public");

  // Form state
  const [formData, setFormData] = useState({
    submittedBy: { name: "", email: "", phoneNumber: "" },
    location: {
      country: "India",
      state: "",
      district: "",
      pincode: "",
      address: "",
      latitude: null,
      longitude: null,
    },
    descriptionComponents: {
      reportType: "outbreak",
      diseaseCategory: "",
      suspectedCases: 0,
      basicInfo: "",
      symptoms: "",
      additionalNotes: "",
    },
    severity: "moderate",
  });
  const [selectedImages, setSelectedImages] = useState([]);

  // Check if user is authenticated and get user info
  useEffect(() => {
    const token = getToken();
    if (token) {
      fetchCurrentUser();
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [filters]);

  const fetchCurrentUser = async () => {
    try {
      const userData = await userApi.getCurrentUser();
      console.log("User data received:", userData); // Debug log

      if (userData.success && userData.data && userData.data.user) {
        const user = userData.data.user;
        setCurrentUser(user);

        // Set user role based on the user's role from backend
        if (
          user.role &&
          ["ngo", "health_worker", "doctor", "patient"].includes(user.role)
        ) {
          setUserRole(user.role);
          console.log("User role set to:", user.role); // Debug log
        } else {
          setUserRole("public");
          console.log("User role set to public"); // Debug log
        }

        // Pre-fill form with user data if available
        setFormData((prev) => ({
          ...prev,
          submittedBy: {
            name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "",
            email: user.email || "",
            phoneNumber: user.phone || "",
          },
        }));
      } else {
        console.log("Invalid user data structure:", userData); // Debug log
        setUserRole("public");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      // If error fetching user, treat as public user
      setUserRole("public");
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const result = await outbreakApi.getAllReports(filters);
      setReports(result.data?.reports || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
      // Show user-friendly error message
      if (error.response?.status === 401) {
        alert("Session expired. Please log in again.");
        handleLogout();
      } else {
        alert("Error fetching reports. Please try again.");
      }
    }
    setLoading(false);
  };

  const handleSubmitReport = async () => {
    // Validate required fields
    if (!formData.submittedBy.name || !formData.submittedBy.email) {
      alert("Please fill in your name and email.");
      return;
    }

    if (!formData.location.state || !formData.location.district) {
      alert("Please fill in state and district information.");
      return;
    }

    if (!formData.descriptionComponents.diseaseCategory) {
      alert("Please select a disease category.");
      return;
    }

    if (!formData.location.latitude || !formData.location.longitude) {
      alert("Please select a location on the map or provide coordinates.");
      return;
    }

    setLoading(true);

    const formDataToSend = new FormData();

    // Flatten the nested form data structure for backend compatibility
    // submittedBy fields
    formDataToSend.append("submittedBy[name]", formData.submittedBy.name);
    formDataToSend.append("submittedBy[email]", formData.submittedBy.email);
    formDataToSend.append(
      "submittedBy[phoneNumber]",
      formData.submittedBy.phoneNumber || ""
    );

    // location fields
    formDataToSend.append("location[country]", formData.location.country);
    formDataToSend.append("location[state]", formData.location.state);
    formDataToSend.append("location[district]", formData.location.district);
    formDataToSend.append("location[pincode]", formData.location.pincode || "");
    formDataToSend.append("location[address]", formData.location.address || "");
    formDataToSend.append("location[latitude]", formData.location.latitude);
    formDataToSend.append("location[longitude]", formData.location.longitude);

    // descriptionComponents fields
    formDataToSend.append(
      "descriptionComponents[reportType]",
      formData.descriptionComponents.reportType
    );
    formDataToSend.append(
      "descriptionComponents[diseaseCategory]",
      formData.descriptionComponents.diseaseCategory
    );
    formDataToSend.append(
      "descriptionComponents[suspectedCases]",
      formData.descriptionComponents.suspectedCases
    );
    formDataToSend.append(
      "descriptionComponents[basicInfo]",
      formData.descriptionComponents.basicInfo || ""
    );
    formDataToSend.append(
      "descriptionComponents[symptoms]",
      formData.descriptionComponents.symptoms || ""
    );
    formDataToSend.append(
      "descriptionComponents[additionalNotes]",
      formData.descriptionComponents.additionalNotes || ""
    );

    // severity
    formDataToSend.append("severity", formData.severity);

    // Add images
    selectedImages.forEach((image) => {
      formDataToSend.append("images", image);
    });

    try {
      const result = await outbreakApi.submitReport(formDataToSend);
      if (result.success) {
        alert("Report submitted successfully!");
        setShowForm(false);
        resetForm();
        fetchReports();
      } else {
        alert(result.message || "Error submitting report");
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      if (error.response?.status === 401) {
        alert("Please log in to submit reports.");
        handleLogout();
      } else {
        alert(error.response?.data?.message || "Error submitting report");
      }
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      submittedBy: {
        name: currentUser
          ? `${currentUser.firstName || ""} ${
              currentUser.lastName || ""
            }`.trim() || ""
          : "",
        email: currentUser?.email || "",
        phoneNumber: currentUser?.phone || "",
      },
      location: {
        country: "India",
        state: "",
        district: "",
        pincode: "",
        address: "",
        latitude: null,
        longitude: null,
      },
      descriptionComponents: {
        reportType: "outbreak",
        diseaseCategory: "",
        suspectedCases: 0,
        basicInfo: "",
        symptoms: "",
        additionalNotes: "",
      },
      severity: "moderate",
    });
    setSelectedImages([]);
  };

  const handleVerifyReport = async (reportId) => {
    if (!getToken()) {
      alert("Please login to verify reports");
      return;
    }

    try {
      const result = await outbreakApi.verifyReport(reportId);
      if (result.success) {
        alert("Report verified successfully!");
        fetchReports();
      } else {
        alert(result.message || "Error verifying report");
      }
    } catch (error) {
      console.error("Error verifying report:", error);
      if (error.response?.status === 401) {
        alert("Please login to verify reports");
        handleLogout();
      } else if (error.response?.status === 403) {
        alert("You don't have permission to verify reports");
      } else {
        alert(error.response?.data?.message || "Error verifying report");
      }
    }
  };

  const handleToggleStatus = async (reportId) => {
    if (!getToken()) {
      alert("Please login to toggle report status");
      return;
    }

    try {
      const result = await outbreakApi.toggleReportStatus(reportId);
      if (result.success) {
        alert(result.message || "Report status updated successfully!");
        fetchReports();
      } else {
        alert(result.message || "Error updating report status");
      }
    } catch (error) {
      console.error("Error toggling report status:", error);
      if (error.response?.status === 401) {
        alert("Please login to manage reports");
        handleLogout();
      } else if (error.response?.status === 403) {
        alert("You don't have permission to manage reports");
      } else {
        alert(error.response?.data?.message || "Error updating report status");
      }
    }
  };

  const filteredReports = reports.filter((report) => {
    if (filters.includeInactive) return true;
    return report.isActive && isRecentReport(report.createdAt);
  });

  const handleLogout = () => {
    removeToken();
    navigate("/signin");
  };

  const isAuthenticated = !!getToken();

  return (
    <div className="page">
      <Navbar onLogout={handleLogout} />
      <div className="dashboard-container">
        <div className="container">
          {/* Header */}
          <div className="header-section">
            <div className="header-content">
              <div>
                <h1 className="main-title">Outbreak Reporting System</h1>
                <p className="main-subtitle">
                  Monitor and report disease outbreaks in your community
                </p>
              </div>
              <div className="header-controls">
                {/* User Role Display */}
                <div className="user-info">
                  <span className="role-display">
                    Role: {getRoleDisplayName(userRole)}
                  </span>
                  {currentUser && (
                    <span className="user-name">
                      Welcome,{" "}
                      {currentUser.firstName || currentUser.name || "User"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="nav-tabs">
              <button
                onClick={() => setActiveTab("reports")}
                className={`tab-button ${
                  activeTab === "reports" ? "active" : ""
                }`}
              >
                <Eye className="tab-icon" />
                View Reports
              </button>
              <button
                onClick={() => {
                  setActiveTab("submit");
                  setShowForm(true);
                }}
                className={`tab-button ${
                  activeTab === "submit" ? "active" : ""
                }`}
              >
                <Plus className="tab-icon" />
                Submit Report
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          {activeTab === "reports" && (
            <div className="filters-section">
              <div className="filters-grid">
                <input
                  type="text"
                  placeholder="Search by state..."
                  className="filter-input"
                  onChange={(e) =>
                    setFilters({ ...filters, state: e.target.value })
                  }
                />
                <select
                  className="filter-select"
                  onChange={(e) =>
                    setFilters({ ...filters, severity: e.target.value })
                  }
                >
                  <option value="">All Severities</option>
                  {SEVERITY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </option>
                  ))}
                </select>
                <select
                  className="filter-select"
                  onChange={(e) =>
                    setFilters({ ...filters, diseaseCategory: e.target.value })
                  }
                >
                  <option value="">All Categories</option>
                  {DISEASE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category.replace("_", " ").charAt(0).toUpperCase() +
                        category.replace("_", " ").slice(1)}
                    </option>
                  ))}
                </select>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    className="checkbox"
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        includeInactive: e.target.checked,
                      })
                    }
                  />
                  Include Inactive
                </label>
              </div>
            </div>
          )}

          {/* Reports List */}
          {activeTab === "reports" && (
            <div className="reports-list">
              {loading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p className="loading-text">Loading reports...</p>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="no-reports">
                  <p>No reports found matching your criteria.</p>
                </div>
              ) : (
                filteredReports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    userRole={userRole}
                    onVerify={handleVerifyReport}
                    onToggleStatus={handleToggleStatus}
                    isAuthenticated={isAuthenticated}
                  />
                ))
              )}
            </div>
          )}

          {/* Submit Report Form */}
          <SubmitReportForm
            showForm={showForm}
            setShowForm={setShowForm}
            formData={formData}
            setFormData={setFormData}
            selectedImages={selectedImages}
            setSelectedImages={setSelectedImages}
            onSubmit={handleSubmitReport}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default OutbreakDashboard;
