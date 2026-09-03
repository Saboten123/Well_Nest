import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../utils/api.js";
import "../styles/auth.css";

export default function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Validation functions
  const validateName = (name) => {
    if (!name.trim()) return "This field is required";
    if (name.trim().length < 2) return "Must be at least 2 characters";
    if (name.trim().length > 50) return "Must be less than 50 characters";
    if (!/^[a-zA-Z\s'-]+$/.test(name))
      return "Only letters, spaces, hyphens and apostrophes allowed";
    return "";
  };

  const validateEmail = (email) => {
    if (!email.trim()) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    if (email.length > 254) return "Email is too long";
    return "";
  };

  const validatePassword = (password) => {
    if (!password) return "Password is required";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (password.length > 128) return "Password is too long";
    return "";
  };

  const validateRole = (role) => {
    const validRoles = ["patient", "doctor", "health_worker", "ngo"];
    if (!role) return "Please select a role";
    if (!validRoles.includes(role)) return "Please select a valid role";
    return "";
  };

  // Validate individual field
  const validateField = (name, value) => {
    switch (name) {
      case "firstName":
        return validateName(value);
      case "lastName":
        return validateName(value);
      case "email":
        return validateEmail(value);
      case "password":
        return validatePassword(value);
      case "role":
        return validateRole(value);
      default:
        return "";
    }
  };

  // Validate all fields
  const validateForm = () => {
    const errors = {};
    Object.keys(form).forEach((field) => {
      const error = validateField(field, form[field]);
      if (error) errors[field] = error;
    });
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setError(""); // Clear general error when user types

    // Real-time validation
    const fieldError = validateField(name, value);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: fieldError,
    }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const fieldError = validateField(name, value);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: fieldError,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate all fields before submission
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("Please fix the errors above");
      setLoading(false);
      return;
    }

    try {
      // Trim whitespace from names
      const submitData = {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
      };

      await api.post("/auth/signup", submitData);
      navigate("/signin", {
        state: { message: "Account created successfully! Please sign in." },
      });
    } catch (err) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Join the WellNest community</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="firstName">First Name *</label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={form.firstName}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              placeholder="Enter your first name"
              className={fieldErrors.firstName ? "error" : ""}
              maxLength="50"
            />
            {fieldErrors.firstName && (
              <div className="field-error">{fieldErrors.firstName}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Last Name *</label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              value={form.lastName}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              placeholder="Enter your last name"
              className={fieldErrors.lastName ? "error" : ""}
              maxLength="50"
            />
            {fieldErrors.lastName && (
              <div className="field-error">{fieldErrors.lastName}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              placeholder="Enter your email address"
              className={fieldErrors.email ? "error" : ""}
              maxLength="254"
            />
            {fieldErrors.email && (
              <div className="field-error">{fieldErrors.email}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              placeholder="Create a password"
              className={fieldErrors.password ? "error" : ""}
              maxLength="128"
            />
            {fieldErrors.password && (
              <div className="field-error">{fieldErrors.password}</div>
            )}
            <div className="password-requirements">
              <small>Password must be at least 6 characters long</small>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="role">I am a... *</label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              className={fieldErrors.role ? "error" : ""}
            >
              <option value="">Select your role</option>
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="health_worker">Health Worker</option>
              <option value="ngo">NGO</option>
            </select>
            {fieldErrors.role && (
              <div className="field-error">{fieldErrors.role}</div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={
              loading ||
              Object.keys(fieldErrors).some((key) => fieldErrors[key])
            }
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{" "}
            <Link to="/signin" className="link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
