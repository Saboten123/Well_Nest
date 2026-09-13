import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../utils/api.js";
import ThemeToggle from "../components/ThemeToggle";
import "../styles/auth.css";

export default function ForgotPassword() {
    const navigate = useNavigate();

    // step: "email" -> "otp" -> "reset"
    const [step, setStep] = useState("email");
    const [resetToken, setResetToken] = useState("");

    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");

    const handleSendCode = async (e) => {
        e.preventDefault();
        setError("");
        setInfo("");

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address");
            return;
        }

        setLoading(true);
        try {
            const normalizedEmail = email.trim().toLowerCase();
            await api.post("/auth/forgot-password", { email: normalizedEmail });
            setEmail(normalizedEmail);
            setInfo(`If ${normalizedEmail} is registered, a reset code has been sent`);
            setStep("otp");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to send reset code");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setError("");
        setInfo("");

        if (!/^\d{6}$/.test(otp)) {
            setError("Enter the 6-digit code sent to your email");
            return;
        }

        setLoading(true);
        try {
            const response = await api.post("/auth/forgot-password/verify", { email, otp });
            setResetToken(response.data.data.resetToken);
            setInfo("Code verified. Set your new password.");
            setStep("reset");
        } catch (err) {
            setError(err.response?.data?.message || "Incorrect or expired code");
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        setError("");
        setInfo("");
        setLoading(true);
        try {
            await api.post("/auth/forgot-password", { email });
            setInfo(`A new code was sent to ${email}`);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to resend code");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError("");
        setInfo("");

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            await api.post("/auth/reset-password", { email, newPassword, resetToken });
            navigate("/signin", {
                state: { message: "Password reset successfully! Please sign in." },
            });
        } catch (err) {
            setError(err.response?.data?.message || "Failed to reset password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <ThemeToggle className="auth-theme-toggle" />
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Reset Password</h1>
                    <p>We'll email you a code to reset it</p>
                </div>

                {error && <div className="error-message">{error}</div>}
                {info && !error && <div className="success-message">{info}</div>}

                {step === "email" && (
                    <form onSubmit={handleSendCode} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="email">Email Address *</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="Enter your account email"
                                maxLength="254"
                            />
                        </div>

                        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                            {loading ? "Sending Code..." : "Send Reset Code"}
                        </button>
                    </form>
                )}

                {step === "otp" && (
                    <form onSubmit={handleVerifyCode} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="otp">Reset Code *</label>
                            <input
                                id="otp"
                                name="otp"
                                type="text"
                                inputMode="numeric"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                required
                                placeholder="Enter the 6-digit code"
                                maxLength="6"
                            />
                        </div>

                        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                            {loading ? "Verifying..." : "Verify Code"}
                        </button>

                        <button
                            type="button"
                            className="btn btn-secondary btn-full"
                            onClick={handleResendCode}
                            disabled={loading}
                            style={{ marginTop: "0.75rem" }}
                        >
                            Resend Code
                        </button>
                    </form>
                )}

                {step === "reset" && (
                    <form onSubmit={handleResetPassword} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="newPassword">New Password *</label>
                            <input
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                placeholder="Enter a new password"
                                maxLength="128"
                            />
                            <div className="password-requirements">
                                <small>Password must be at least 6 characters long</small>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm New Password *</label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Re-enter your new password"
                                maxLength="128"
                            />
                        </div>

                        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                            {loading ? "Resetting..." : "Reset Password"}
                        </button>
                    </form>
                )}

                <div className="auth-footer">
                    <p>
                        Remembered your password?{" "}
                        <Link to="/signin" className="link">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}