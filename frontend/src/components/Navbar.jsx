import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Calendar,
  MoreVertical,
  User,
  LogOut,
  Stethoscope,
} from "lucide-react";
import "../styles/navbar.css";

export default function Navbar({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef(null);

  // Main navigation items
  const navItems = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/doctors", label: "Doctors" },
    { path: "/ngos", label: "NGOs" },
    { path: "/healthworkers", label: "Health Workers" },
    { path: "/events", label: "Events", icon: <Calendar size={16} /> },
    { path: "/blogs", label: "Blogs" },
    { path: "/outbreak", label: "Outbreak" },
    { path: "/assistant", label: "AI Assistant" },
    { path: "/video-call", label: "Video Call" },
    ...(localStorage.getItem("userRole") === "admin"
      ? [{ path: "/admin", label: "Admin" }]
      : []),
  ];

  // Dropdown menu items
  const dropdownItems = [
    {
      path: "/profile",
      label: "Profile",
      icon: <User size={18} />,
      onClick: () => {
        navigate("/profile");
        setShowDropdown(false);
      },
    },
    {
      label: "Logout",
      icon: <LogOut size={18} />,
      onClick: () => {
        onLogout();
        setShowDropdown(false);
      },
      danger: true,
    },
  ];

  const isActive = (path) => location.pathname === path;

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <nav className={`navbar ${isScrolled ? "scrolled" : ""}`}>
      {/* Brand */}
      <div className="navbar-brand" onClick={() => navigate("/")}>
        <span className="navbar-logo">
          <Stethoscope size={16} />
        </span>
        <h2 className="navbar-title">WellNest</h2>
      </div>

      {/* Navigation */}
      <div className="navbar-menu">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`navbar-item ${isActive(item.path) ? "active" : ""}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </div>

      {/* Actions */}
      <div className="navbar-actions">
        <div className="dropdown-container" ref={dropdownRef}>
          <button
            className={`dropdown-trigger ${showDropdown ? "open" : ""}`}
            onClick={() => setShowDropdown(!showDropdown)}
            aria-label="More options"
          >
            <MoreVertical size={18} />
          </button>

          {showDropdown && (
            <div className="dropdown-menu">
              {dropdownItems.map((item, index) => (
                <button
                  key={index}
                  className={`dropdown-item ${item.danger ? "danger" : ""}`}
                  onClick={item.onClick}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}