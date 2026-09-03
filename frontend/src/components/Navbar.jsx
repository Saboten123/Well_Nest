import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Calendar,
  MoreVertical,
  User,
  LogOut,
  Stethoscope,
} from "lucide-react";

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
    { path: "/video-call", label: "call" },
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
    <nav
      className={`navbar ${isScrolled ? "scrolled" : ""}`}
      style={{
        background: "linear-gradient(135deg, rgba(219, 234, 254, 0.95), rgba(191, 219, 254, 0.95))",
        backdropFilter: "blur(20px)",
        borderBottom:"1px solid rgba(147, 197, 253, 0.2)",
        padding: "1rem 3rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow:  "0 2px 20px rgba(147, 197, 253, 0.2)",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Brand */}
      <div
        className="navbar-brand"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            background: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.4)",
          }}
        >
          <Stethoscope size={20} color="white" />
        </div>
        <h2
          className="navbar-title"
          onClick={() => navigate("/")}
          style={{
            fontSize: "1.8rem",
            fontWeight: "700",
            background: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            margin: 0,
            cursor: "pointer",
            transition: "all 0.3s ease",
            letterSpacing: "-0.5px",
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "scale(1)";
          }}
        >
          WellNest
        </h2>
      </div>

      {/* Navigation Menu */}
      <div
        className="navbar-menu"
        style={{
          display: "flex",
          gap: "0.25rem",
          flex: 1,
          justifyContent: "center",
          margin: "0 2rem",
          padding: "0.5rem",
          background:
            "linear-gradient(135deg, rgba(239, 246, 255, 0.7), rgba(219, 234, 254, 0.6))",
          borderRadius: "16px",
          border: "1px solid rgba(147, 197, 253, 0.3)",
          boxShadow: "inset 0 1px 2px rgba(59, 130, 246, 0.1)",
        }}
      >
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.25rem",
              borderRadius: "12px",
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              color: isActive(item.path) ? "white" : "#1E40AF",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "0.9rem",
              background: isActive(item.path)
                ? "linear-gradient(135deg, #3B82F6, #1D4ED8)"
                : "transparent",
              boxShadow: isActive(item.path)
                ? "0 4px 12px rgba(59, 130, 246, 0.4)"
                : "none",
              transform: isActive(item.path)
                ? "translateY(-1px)"
                : "translateY(0)",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              if (!isActive(item.path)) {
                e.target.style.background =
                  "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(29, 78, 216, 0.1))";
                e.target.style.color = "#1D4ED8";
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 4px 8px rgba(59, 130, 246, 0.2)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive(item.path)) {
                e.target.style.background = "transparent";
                e.target.style.color = "#1E40AF";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
              }
            }}
          >
            {item.icon && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  transition: "transform 0.3s ease",
                }}
              >
                {item.icon}
              </span>
            )}
            {item.label}
          </Link>
        ))}
      </div>

      {/* Actions */}
      <div className="navbar-actions">
        <div
          className="dropdown-container"
          ref={dropdownRef}
          style={{ position: "relative" }}
        >
          <button
            className="dropdown-trigger"
            onClick={() => setShowDropdown(!showDropdown)}
            aria-label="More options"
            style={{
              background: showDropdown
                ? "linear-gradient(135deg, #3B82F6, #1D4ED8)"
                : "linear-gradient(135deg, rgba(239, 246, 255, 0.8), rgba(219, 234, 254, 0.6))",
              border: showDropdown
                ? "none"
                : "1px solid rgba(147, 197, 253, 0.4)",
              borderRadius: "14px",
              padding: "0.75rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              color: showDropdown ? "white" : "#1E40AF",
              boxShadow: showDropdown
                ? "0 4px 12px rgba(59, 130, 246, 0.4)"
                : "0 2px 8px rgba(147, 197, 253, 0.2)",
              transform: showDropdown
                ? "rotate(90deg) scale(1.05)"
                : "rotate(0deg) scale(1)",
            }}
            onMouseEnter={(e) => {
              if (!showDropdown) {
                e.target.style.borderColor = "#3B82F6";
                e.target.style.color = "#1D4ED8";
                e.target.style.background =
                  "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(29, 78, 216, 0.1))";
                e.target.style.transform = "scale(1.05)";
                e.target.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.3)";
              }
            }}
            onMouseLeave={(e) => {
              if (!showDropdown) {
                e.target.style.borderColor = "rgba(147, 197, 253, 0.4)";
                e.target.style.color = "#1E40AF";
                e.target.style.background =
                  "linear-gradient(135deg, rgba(239, 246, 255, 0.8), rgba(219, 234, 254, 0.6))";
                e.target.style.transform = "scale(1)";
                e.target.style.boxShadow = "0 2px 8px rgba(147, 197, 253, 0.2)";
              }
            }}
          >
            <MoreVertical size={20} />
          </button>

          {showDropdown && (
            <div
              className="dropdown-menu"
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "0.75rem",
                background:
                  "linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(239, 246, 255, 0.9))",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(147, 197, 253, 0.3)",
                borderRadius: "16px",
                boxShadow: "0 20px 40px rgba(59, 130, 246, 0.2)",
                minWidth: "200px",
                overflow: "hidden",
                zIndex: 1001,
                animation: "dropdownSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                transformOrigin: "top right",
              }}
            >
              <style>
                {`
                  @keyframes dropdownSlideIn {
                    from {
                      opacity: 0;
                      transform: scale(0.9) translateY(-10px);
                    }
                    to {
                      opacity: 1;
                      transform: scale(1) translateY(0);
                    }
                  }
                `}
              </style>
              {dropdownItems.map((item, index) => (
                <button
                  key={index}
                  className="dropdown-item"
                  onClick={item.onClick}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "1rem 1.25rem",
                    border: "none",
                    background: "transparent",
                    color: item.danger ? "#ef4444" : "#1E40AF",
                    cursor: "pointer",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    fontSize: "0.95rem",
                    fontWeight: "500",
                    textAlign: "left",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = item.danger
                      ? "linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05))"
                      : "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(29, 78, 216, 0.05))";
                    e.target.style.transform = "translateX(4px)";
                    e.target.style.color = item.danger ? "#dc2626" : "#1D4ED8";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "transparent";
                    e.target.style.transform = "translateX(0)";
                    e.target.style.color = item.danger ? "#ef4444" : "#1E40AF";
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      transition: "transform 0.2s ease",
                    }}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Responsive styles */}
      <style>
        {`
          @media (max-width: 1200px) {
            .navbar {
              flex-direction: column !important;
              gap: 1.5rem !important;
              padding: 1.5rem !important;
            }
            
            .navbar-menu {
              margin: 0 !important;
              flex-wrap: wrap !important;
              justify-content: center !important;
              gap: 0.5rem !important;
            }
          }

          @media (max-width: 768px) {
            .navbar {
              padding: 1rem !important;
            }
            
            .navbar-title {
              font-size: 1.5rem !important;
            }
            
            .navbar-menu {
              gap: 0.25rem !important;
              padding: 0.25rem !important;
            }
            
            .navbar-menu a {
              padding: 0.6rem 1rem !important;
              font-size: 0.85rem !important;
            }
          }

          @media (max-width: 480px) {
            .navbar {
              flex-direction: column !important;
              gap: 1rem !important;
              padding: 0.75rem !important;
            }
            
            .navbar-menu {
              flex-direction: column !important;
              width: 100% !important;
              gap: 0.5rem !important;
            }
            
            .navbar-menu a {
              justify-content: center !important;
              padding: 0.75rem !important;
            }
          }
        `}
      </style>
    </nav>
  );
}
