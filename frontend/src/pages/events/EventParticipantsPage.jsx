import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "../../styles/event-styles/EventParticipantsPage.css";
import Navbar from "../../components/Navbar.jsx";
import { blockchainApi } from "../../utils/api.js"; // ✅ Axios instance

const EventParticipantsPage = () => {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const location = useLocation();
  const { eventType } = location.state || {};
  const userRole = localStorage.getItem("userRole");
  const currentUserId = localStorage.getItem("userId");
  const [participants, setParticipants] = useState([]);
  const [eventDetails, setEventDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        // Fetch all events organized by current user
        const eventResp = await blockchainApi.get("/organise/all");
        if (eventResp.data.success) {
          const evt = (eventResp.data.orgs || []).find(
            (e) => e._id === eventId
          );
          setEventDetails(evt || null);
        }

        // Fetch participants for the event
        const resp = await blockchainApi.get(`/part/participants/${eventId}`);
        if (resp.data.success) {
          setParticipants(resp.data.participants || []);
        }
      } catch (err) {
        console.error("Error loading participants:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [eventId]);

  const handleVerifyParticipant = async (participantId) => {
    try {
      setVerifying(participantId);
      const resp = await blockchainApi.post(`/part/verify/${participantId}`);
      if (resp.data.success) {
        setParticipants((prev) =>
          prev.map((p) =>
            p._id === participantId ? { ...p, verified: true } : p
          )
        );
      } else {
        alert(resp.data.error || "Verification failed");
      }
    } catch (err) {
      console.error("Verify error:", err);
    } finally {
      setVerifying(null);
    }
  };

  if (loading) {
    return <div className="event-page">Loading...</div>;
  }

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/signin");
  };

  const canVerify =
    ["ngo", "health_worker"].includes(userRole || "") &&
    eventDetails &&
    eventDetails.shortId === currentUserId;

  return (
    <div className="page">
      <Navbar onLogout={handleLogout} />
      <div className="event-page">
        <div className="event-container">
          {/* Header */}
          <div className="event-header">
            <button onClick={() => navigate(-1)} className="back-button">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Events
            </button>

            <div className="event-card">
              <h1 className="event-title">Event Organiser</h1>
              {eventDetails && (
                <div className="event-info">
                  <div>
                    <strong>Organizer:</strong> {eventDetails.name}
                  </div>
                  <div>
                    <strong>Date:</strong>{" "}
                    {new Date(eventDetails.date).toLocaleDateString()}
                  </div>
                  <div>
                    <strong>Time:</strong>{" "}
                    {new Date(
                      `2000-01-01T${eventDetails.startTime}`
                    ).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                    {" - "}
                    {new Date(
                      `2000-01-01T${eventDetails.endTime}`
                    ).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </div>
                  <div>
                    <strong>Location:</strong> {eventDetails.location}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <table className="participants-table">
            <thead>
              <tr>
                <th>Participant</th>
                <th>Registration Date</th>
                <th>Status</th>
                {canVerify && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p._id} className="participants-row">
                  <td>
                    {`${p.userId?.firstName || ""} ${
                      p.userId?.lastName || ""
                    }`.trim()}
                  </td>
                  <td>{new Date(p.registeredAt).toLocaleString()}</td>
                  <td
                    className={
                      p.verified ? "status-verified" : "status-pending"
                    }
                  >
                    {p.verified ? "Verified" : "Pending"}
                  </td>
                  {canVerify && (
                    <td>
                        <button
                          className="verify-button"
                          onClick={() => handleVerifyParticipant(p._id)}
                          disabled={verifying === p._id || p.verified}
                        >
                          Verify
                        </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Rewards */}
          {eventType === "blood-donation" && (
            <div className="reward-box">
              <h3 className="reward-title">Blood Donation Rewards</h3>
              <p className="reward-text">
                Verified donors receive crypto rewards after organiser
                verification.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventParticipantsPage;
