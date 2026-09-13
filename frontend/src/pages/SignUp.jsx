import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../utils/api.js";
import "../styles/auth.css";

export default function SignUp() {
  const navigate = useNavigate();

  // step: "email" -> "otp" -> "details"
  const [step, setStep] = useState("email");
  const [signupToken, setSignupToken] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "",
  });
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
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

  // Validate all fields (excluding email, which is locked after step 1)
  const validateForm = () => {
    const errors = {};
    ["firstName", "lastName", "password", "role"].forEach((field) => {
      const error = validateField(field, form[field]);
      if (error) errors[field] = error;
    });
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setError("");

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

  // Step 1: send OTP to the entered email
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    const emailError = validateEmail(form.email);
    if (emailError) {
      setFieldErrors((prev) => ({ ...prev, email: emailError }));
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = form.email.trim().toLowerCase();
      await api.post("/auth/otp/send", { email: normalizedEmail });
      setForm((prev) => ({ ...prev, email: normalizedEmail }));
      setInfo(`A 6-digit code was sent to ${normalizedEmail}`);
      setStep("otp");
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2: verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code sent to your email");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/otp/verify", {
        email: form.email,
        otp,
      });
      setSignupToken(response.data.data.signupToken);
      setInfo("Email verified. Complete your details to finish signing up.");
      setStep("details");
    } catch (err) {
      setError(err.response?.data?.message || "Incorrect or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await api.post("/auth/otp/send", { email: form.email });
      setInfo(`A new code was sent to ${form.email}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: finish signup with verified email + signupToken
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("Please fix the errors above");
      setLoading(false);
      return;
    }

    try {
      const submitData = {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        signupToken,
      };

      await api.post("/auth/signup", submitData);
      navigate("/signin", {
        state: { message: "Account created successfully! Please sign in." },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create account");
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
        {info && !error && <div className="success-message">{info}</div>}

        {step === "email" && (
          <form onSubmit={handleSendOtp} className="auth-form">
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

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? "Sending Code..." : "Send Verification Code"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="auth-form">
            <div className="form-group">
              <label htmlFor="otp">Verification Code *</label>
              <input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                required
                placeholder="Enter the 6-digit code"
                maxLength="6"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-full"
              onClick={handleResendOtp}
              disabled={loading}
              style={{ marginTop: "0.75rem" }}
            >
              Resend Code
            </button>
          </form>
        )}

        {step === "details" && (
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
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                disabled
              />
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
        )}

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
