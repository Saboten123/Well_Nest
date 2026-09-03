import React from "react";

export default function WellnestSection({ user }) {
  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Welcome to WellNest</h1>
        <p className="section-subtitle">Your comprehensive healthcare community platform</p>
      </div>

      <div className="section-content">
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div className="card-icon">👋</div>
              <h3 className="card-title">Welcome, {user?.firstName}!</h3>
            </div>
            <div className="card-content">
              <p>You're logged in as a <strong>{user?.role}</strong>.</p>
              <p>Use the navigation tabs above to explore different sections of WellNest.</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-icon">🏥</div>
              <h3 className="card-title">Healthcare Services</h3>
            </div>
            <div className="card-content">
              <ul className="service-list">
                <li>Find qualified doctors in your area</li>
                <li>Connect with community health workers</li>
                <li>Access NGO healthcare services</li>
                <li>Manage your healthcare profile</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
