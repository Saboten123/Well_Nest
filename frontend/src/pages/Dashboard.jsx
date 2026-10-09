import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api.js";
import Navbar from "../components/Navbar.jsx";

function getGreeting(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Good night";
}

export default function Dashboard() {
  const [greeting, setGreeting] = useState(getGreeting());

  // keep the greeting in sync with the clock while the page stays open
  useEffect(() => {
    const id = setInterval(() => setGreeting(getGreeting()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/signin");
      return;
    }
    fetchUser();
  }, [navigate]);

  const fetchUser = async () => {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data.data.user);
    } catch (err) {
      console.error("Error fetching user:", err);
      navigate("/signin");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/signin");
  };

  if (loading) {
    return (
      <div className="page">
        <Navbar onLogout={handleLogout} />
        <div className="page-content">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Navbar onLogout={handleLogout} />
      <div className="page-content">
        <div className="welcome-section">
          <div className="welcome-card">
            <h2>{greeting}, {user?.firstName}.</h2>
            <div className="user-role">
              <span className="badge badge-primary">{user?.role}</span>
            </div>
          </div>
        </div>

        <div className="section-header">
          <h1 className="section-title">Dashboard</h1>
        </div>

        <div className="section-content">
          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <div className="card-icon">👨‍⚕️</div>
                <h3 className="card-title">Find Doctors</h3>
              </div>
              <div className="card-content">
                <p>Connect with qualified healthcare professionals in your area.</p>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate("/doctors")}
                >
                  Browse Doctors
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-icon">🏛️</div>
                <h3 className="card-title">Connect with NGOs</h3>
              </div>
              <div className="card-content">
                <p>Discover non-governmental organizations working for community health.</p>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate("/ngos")}
                >
                  View NGOs
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-icon">🏥</div>
                <h3 className="card-title">Health Workers</h3>
              </div>
              <div className="card-content">
                <p>Access community health workers for local healthcare support.</p>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate("/healthworkers")}
                >
                  Find Health Workers
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-icon">📰</div>
                <h3 className="card-title">Health Blogs</h3>
              </div>
              <div className="card-content">
                <p>Stay informed with healthcare insights and updates from experts.</p>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate("/blogs")}
                >
                  Read Blogs
                </button>
              </div>
            </div>
          </div>

          <div className="quick-actions">
            <div className="card">
              <div className="card-header">
                <div className="card-icon">⚡</div>
                <h3 className="card-title">Quick Actions</h3>
              </div>
              <div className="card-content">
                <div className="quick-actions-grid">
                  <button
                    className="btn btn-outline"
                    onClick={() => navigate("/profile")}
                  >
                    Edit Profile
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => navigate("/blogs")}
                  >
                    View All Blogs
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => navigate("/doctors")}
                  >
                    Find Doctor
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => navigate("/ngos")}
                  >
                    Browse NGOs
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}