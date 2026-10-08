import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { HeartPulse } from "lucide-react";
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

  const capabilities = [
    ["01", "Expert healthcare", "Connect with qualified doctors and healthcare professionals in your area, from first consultation to follow-up."],
    ["02", "NGO network", "Access healthcare services and support from trusted non-governmental organisations, with donations handled on-chain."],
    ["03", "Community health", "Reach local health workers for community-based care, outbreak reporting and public-health response."],
    ["04", "Health education", "Informative blogs and articles from healthcare experts, plus an AI assistant for everyday questions."],
  ];

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-nav">
        <div className="landing-nav-brand" onClick={() => navigate("/")}>
          <span className="landing-nav-logo">
            <HeartPulse size={16} />
          </span>
          <span>WellNest</span>
          <small>Healthcare</small>
        </div>
        <nav className="landing-nav-links">
          <a href="#capabilities">Capabilities</a>
          <a href="#ai-assistant">AI assistant</a>
          <a href="#about">About</a>
        </nav>
        <div className="landing-nav-actions">
          <button
            className="btn btn-outline landing-nav-btn"
            onClick={() => navigate("/signin")}
          >
            Sign in
          </button>
          <button
            className="btn btn-primary landing-nav-btn"
            onClick={() => navigate("/signup")}
          >
            Get started
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <span className="eyebrow">Healthcare platform · community-first</span>
            <h1 className="hero-title">
              Care that reaches everyone. <em>Built for the moments that can&rsquo;t wait.</em>
            </h1>
            <p className="hero-subtitle">
              WellNest connects patients, doctors, health workers and NGOs on
              one platform, so communities get better health outcomes with
              fewer hand-offs.
            </p>
            <div className="hero-actions">
              <button
                className="btn btn-primary btn-large"
                onClick={() => navigate("/signup")}
              >
                Create an account &rarr;
              </button>
              <button
                className="btn btn-outline btn-large"
                onClick={() => navigate("/signin")}
              >
                Sign in
              </button>
            </div>
          </div>

          <aside className="readout" aria-label="Platform overview">
            <div className="readout-head">
              <span>platform_readout</span>
              <span className="readout-live">online</span>
            </div>
            <dl>
              <div className="readout-row"><dt>doctors</dt><dd>1000+</dd></div>
              <div className="readout-row"><dt>ngos</dt><dd>50+</dd></div>
              <div className="readout-row"><dt>health workers</dt><dd>100+</dd></div>
              <div className="readout-row"><dt>ai assistant</dt><dd>24 / 7</dd></div>
              <div className="readout-row"><dt>donations</dt><dd>on-chain</dd></div>
            </dl>
          </aside>
        </div>
      </section>

      {/* Network strip */}
      <section className="strip">
        <div className="container">
          <span className="eyebrow eyebrow--plain">Connected network</span>
          <ul className="strip-list">
            <li>Doctors</li>
            <li>NGOs</li>
            <li>Health workers</li>
            <li>Outbreak tracking</li>
            <li>Health events</li>
          </ul>
        </div>
      </section>

      {/* Capabilities */}
      <section className="features-section" id="capabilities">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Capabilities</span>
              <h2 className="section-title">
                Four things done properly, so nobody falls between systems.
              </h2>
            </div>
            <p className="section-subtitle">
              Every part of WellNest exists to shorten the distance between a
              person who needs care and the people who can give it.
            </p>
          </div>
          <div className="features-grid">
            {capabilities.map(([num, title, text]) => (
              <div className="feature-card" key={num}>
                <span className="feature-num">{num}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI assistant */}
      <section className="ai-section" id="ai-assistant">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">AI health assistant</span>
              <h2 className="section-title">Ask first. Then decide what to do next.</h2>
            </div>
            <p className="section-subtitle">
              Ask health-related questions. If you&rsquo;re signed in, your
              conversation persists securely; otherwise a guest session is used.
            </p>
          </div>
          <div className="ai-chat">
            <div className="ai-messages">
              {chatMessages.length === 0 ? (
                <div className="ai-empty">
                  &gt; start the conversation by asking a question&hellip;
                </div>
              ) : (
                chatMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`ai-row ${m.role === "user" ? "ai-row--user" : ""}`}
                  >
                    <div className="ai-bubble">{m.content}</div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="ai-input">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your question here…"
                rows={5}
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

      {/* About */}
      <section className="about-section" id="about">
        <div className="container">
          <div className="about-content">
            <div className="about-text">
              <span className="eyebrow">About WellNest</span>
              <h2>A unified platform for healthcare services and support.</h2>
              <p>
                WellNest bridges the gap between healthcare providers and
                patients. Our mission is to make quality healthcare accessible
                to everyone with one place for services, information and
                support.
              </p>
              <p>
                We connect patients with qualified doctors, health workers and
                NGOs, and give communities a platform for health education and
                engagement.
              </p>
            </div>
            <div className="about-stats">
              <div className="stat-item">
                <div className="stat-number">1000+</div>
                <div className="stat-label">Healthcare professionals</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">50+</div>
                <div className="stat-label">NGOs</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">100+</div>
                <div className="stat-label">Health workers</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-box">
            <div>
              <span className="eyebrow">Next step</span>
              <h2>Ready to get started?</h2>
              <p>Join the people who trust WellNest for their healthcare needs.</p>
            </div>
            <button
              className="btn btn-primary btn-large"
              onClick={() => navigate("/signup")}
            >
              Create your account &rarr;
            </button>
          </div>
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
                  <li><button onClick={() => navigate("/doctors")}>Find Doctors</button></li>
                  <li><button onClick={() => navigate("/ngos")}>NGOs</button></li>
                  <li><button onClick={() => navigate("/healthworkers")}>Health Workers</button></li>
                  <li><button onClick={() => navigate("/blogs")}>Health Blogs</button></li>
                </ul>
              </div>
              <div className="footer-section">
                <h4>Account</h4>
                <ul>
                  <li><button onClick={() => navigate("/signup")}>Sign Up</button></li>
                  <li><button onClick={() => navigate("/signin")}>Sign In</button></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>&copy; {new Date().getFullYear()} WellNest. All rights reserved.</span>
            <span>est. 2024</span>
          </div>
        </div>
      </footer>
    </div>
  );
}