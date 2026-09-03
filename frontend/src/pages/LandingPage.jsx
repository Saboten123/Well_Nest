import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { aiApi } from "../utils/api";
import "./LandingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // AI Assistant state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]); // [{role:"user"|"assistant", content:string}]
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (location.hash === "#ai-assistant") {
      const el = document.getElementById("ai-assistant");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [location]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const sendMessage = async () => {
    const message = chatInput.trim();
    if (!message || isSending) return;
    setIsSending(true);
    setChatMessages((prev) => [...prev, { role: "user", content: message }]);
    setChatInput("");
    try {
      const { data } = await aiApi.post("/chat", { message });
      const reply = data?.reply || "";
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't process that. Please try again.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              <span className="brand-highlight">WellNest</span>
              <br />
              Healthcare Platform
            </h1>
            <p className="hero-subtitle">
              A comprehensive healthcare ecosystem connecting patients,
              healthcare professionals, and organizations for better community
              health outcomes.
            </p>
            <div className="hero-actions">
              <button
                className="btn btn-primary btn-large"
                onClick={() => navigate("/signup")}
              >
                Get Started
              </button>
              <button
                className="btn btn-outline btn-large"
                onClick={() => navigate("/signin")}
              >
                Sign In
              </button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-icon">🏥</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Why Choose WellNest?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">👨‍⚕️</div>
              <h3>Expert Healthcare</h3>
              <p>
                Connect with qualified doctors and healthcare professionals in
                your area
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🏛️</div>
              <h3>NGO Network</h3>
              <p>
                Access healthcare services and support from trusted
                non-governmental organizations
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🏥</div>
              <h3>Community Health</h3>
              <p>
                Connect with local health workers for community-based healthcare
                support
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📰</div>
              <h3>Health Education</h3>
              <p>
                Access informative blogs and articles from healthcare experts
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Assistant Section */}
      <section className="ai-section" id="ai-assistant">
        <div className="container">
          <h2 className="section-title">AI Health Assistant</h2>
          <p style={{ marginBottom: "12px" }}>
            Ask health-related questions. If you're signed in, your conversation
            persists securely; otherwise, a guest session is used.
          </p>
          <div
            className="ai-chat"
            style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}
          >
            <div
              className="ai-messages"
              style={{
                flex: 1,
                minHeight: "220px",
                maxHeight: "360px",
                overflowY: "auto",
                border: "1px solid #eee",
                borderRadius: "8px",
                padding: "12px",
              }}
            >
              {chatMessages.length === 0 ? (
                <div style={{ color: "#666" }}>
                  Start the conversation by asking a question…
                </div>
              ) : (
                chatMessages.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      margin: "8px 0",
                      display: "flex",
                      justifyContent:
                        m.role === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        background: m.role === "user" ? "#4f46e5" : "#f3f4f6",
                        color: m.role === "user" ? "#fff" : "#111",
                        padding: "8px 12px",
                        borderRadius: "12px",
                        maxWidth: "80%",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {m.content}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <div
              className="ai-input"
              style={{
                width: "320px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your question here…"
                rows={5}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                }}
              />
              <button
                className="btn btn-primary"
                onClick={sendMessage}
                disabled={isSending || !chatInput.trim()}
              >
                {isSending ? "Sending…" : "Ask"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section">
        <div className="container">
          <div className="about-content">
            <div className="about-text">
              <h2>About WellNest</h2>
              <p>
                WellNest is a comprehensive healthcare platform designed to
                bridge the gap between healthcare providers and patients. Our
                mission is to make quality healthcare accessible to everyone by
                providing a unified platform for healthcare services,
                information, and support.
              </p>
              <p>
                We connect patients with qualified doctors, health workers, and
                NGOs, while providing a platform for healthcare education and
                community engagement. Whether you're seeking medical
                consultation, community health support, or health-related
                information, WellNest is your trusted healthcare companion.
              </p>
            </div>
            <div className="about-stats">
              <div className="stat-item">
                <div className="stat-number">1000+</div>
                <div className="stat-label">Healthcare Professionals</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">50+</div>
                <div className="stat-label">NGOs</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">100+</div>
                <div className="stat-label">Health Workers</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <h2>Ready to Get Started?</h2>
          <p>
            Join thousands of users who trust WellNest for their healthcare
            needs
          </p>
          <button
            className="btn btn-primary btn-large"
            onClick={() => navigate("/signup")}
          >
            Create Your Account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <h3>WellNest</h3>
              <p>Your trusted healthcare platform</p>
            </div>
            <div className="footer-links">
              <div className="footer-section">
                <h4>Platform</h4>
                <ul>
                  <li>
                    <button onClick={() => navigate("/doctors")}>
                      Find Doctors
                    </button>
                  </li>
                  <li>
                    <button onClick={() => navigate("/ngos")}>NGOs</button>
                  </li>
                  <li>
                    <button onClick={() => navigate("/healthworkers")}>
                      Health Workers
                    </button>
                  </li>
                  <li>
                    <button onClick={() => navigate("/blogs")}>
                      Health Blogs
                    </button>
                  </li>
                </ul>
              </div>
              <div className="footer-section">
                <h4>Account</h4>
                <ul>
                  <li>
                    <button onClick={() => navigate("/signup")}>Sign Up</button>
                  </li>
                  <li>
                    <button onClick={() => navigate("/signin")}>Sign In</button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 WellNest. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
