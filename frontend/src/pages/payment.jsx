import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { blockchainApi } from "../utils/api.js";

import {
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Smartphone,
  Wallet,
  Building,
} from "lucide-react";
import Navbar from "../components/Navbar";
import "../styles/payment.css";

const usePersistentState = (key, initialValue) => {
  const [state, setState] = useState(() => {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
};

export default function Payment() {
  const [amount, setAmount] = usePersistentState("amount", 0);
  const [selectedMethods, setSelectedMethods] = usePersistentState(
    "selectedMethods",
    {
      card: false,
      netbanking: true,
      upi: false,
      wallet: false,
    }
  );

  // These can reset after refresh (normal useState)
  const [paymentStatus, setPaymentStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated and fetch user data
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
    }
  };

  const handleMethodToggle = (method) => {
    setSelectedMethods((prev) => ({
      [method]: !prev[method],
    }));
  };

  const getSelectedMethods = () => {
    const methods = [];
    if (selectedMethods.card) methods.push("card");
    else if (selectedMethods.netbanking) methods.push("netbanking");
    else if (selectedMethods.upi) methods.push("upi");
    else if (selectedMethods.wallet) methods.push("wallet");
    return methods;
  };

  const initializePayment = async () => {
    if (amount < 1) {
      alert("Please enter a valid amount (minimum ₹1)");
      return;
    }

    const selectedMethodsList = getSelectedMethods();
    if (selectedMethodsList.length === 0) {
      alert("Please select at least one payment method");
      return;
    }

    if (!user) {
      alert("User not authenticated. Please login again.");
      navigate("/signin");
      return;
    }

    setLoading(true);
    setPaymentStatus("");

    try {
      // Calculate reward tokens (amount / 10)
      const rewardTokens = amount / 10;

      // Send PATCH request to the blockchain API for donation
      const response = await blockchainApi.patch("/pay/donate", {
        userId: user._id || user.id, // Use the actual user ID from the authenticated user
        amount: amount,
        reward: rewardTokens,
        // paymentMethod: selectedMethodsList[0], // Send the selected payment method
      });

      if (response.status === 200) {
        setPaymentStatus("success");

        // Show success popup
        setPopupMessage(
          `Payment Successful! You received ${rewardTokens} tokens 🎉`
        );
        setShowPopup(true);

        // Hide popup after 3 seconds
        setTimeout(() => {
          setShowPopup(false);
        }, 3000);
      } else {
        setPaymentStatus("failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      setPaymentStatus("error");

      // Show error message if available
      const errorMessage =
        error.response?.data?.message || "Payment failed. Please try again.";
      setPopupMessage(errorMessage);
      setShowPopup(true);

      setTimeout(() => {
        setShowPopup(false);
      }, 3000);
    }

    setLoading(false);
  };

  const resetTest = () => {
    setPaymentStatus("");
    setLoading(false);
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case "success":
        return <CheckCircle className="icon-success" />;
      case "failed":
        return <XCircle className="icon-failed" />;
      case "cancelled":
        return <AlertCircle className="icon-cancelled" />;
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (paymentStatus) {
      case "success":
        return "Payment successful! 🎉";
      case "failed":
        return "Payment failed. Please try again.";
      case "cancelled":
        return "Payment cancelled by user.";
      case "error":
        return "Error processing payment.";
      default:
        return "";
    }
  };

  const paymentMethods = [
    { key: "card", label: "Credit/Debit Cards", icon: CreditCard },
    { key: "upi", label: "UPI", icon: Smartphone },
    { key: "netbanking", label: "Net Banking", icon: Building },
    { key: "wallet", label: "Wallets", icon: Wallet },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/signin");
  };

  return (
    <div className="page">
      <Navbar onLogout={handleLogout} />
      <div className="page-container">
        <div className="content-container">
          <div className="card">
            <div className="header">
              <h1>Donate for those in need</h1>
              {user && (
                <p
                  style={{ color: "#666", fontSize: "14px", marginTop: "8px" }}
                >
                  Donating as: {user.firstName} {user.lastName} ({user.email})
                </p>
              )}
            </div>

            {/* Left Column */}
            <div className="left-column">
              {/* Amount Input */}
              <div className="section">
                <div className="section-header">
                  <div className="section-icon">₹</div>
                  <h3>Enter the Amount you want to donate</h3>
                </div>
                <div className="amount-input">
                  <span>₹</span>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="Enter amount"
                  />
                </div>
                <p className="note">Can Donate any amount</p>
                <p
                  className="note"
                  style={{ color: "#4caf50", fontSize: "12px" }}
                >
                  💰 You'll receive{" "}
                  {amount > 0 ? (amount / 10).toFixed(1) : "0"} reward tokens
                </p>
              </div>

              {/* Payment Methods */}
              <div className="section">
                <h3>Select Payment Methods</h3>
                <div className="method-grid">
                  {paymentMethods.map((method) => {
                    const IconComponent = method.icon;
                    return (
                      <div
                        key={method.key}
                        onClick={() => handleMethodToggle(method.key)}
                        className={`method-card ${
                          selectedMethods[method.key] ? "active" : ""
                        }`}
                      >
                        <div className="method-content">
                          <div className="method-icon">
                            <IconComponent />
                          </div>
                          <span>{method.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="right-column">
              <div className="summary">
                <div className="summary-header">
                  <h3>Payment Summary</h3>
                </div>
                <div className="summary-body">
                  <div className="summary-row">
                    <span>Donation Amount</span>
                    <span>₹{amount}</span>
                  </div>
                  <div className="summary-row">
                    <span>Reward Tokens</span>
                    <span>
                      {amount > 0 ? (amount / 10).toFixed(1) : "0"} WNT
                    </span>
                  </div>
                  <hr />
                  <div className="summary-total">
                    <span>Total Amount</span>
                    <span>₹{amount}</span>
                  </div>
                  <div className="methods-selected">
                    Selected Methods:{" "}
                    {Object.entries(selectedMethods)
                      .filter(([_, selected]) => selected)
                      .map(([method]) => method.toUpperCase())
                      .join(", ") || "None"}
                  </div>
                </div>
              </div>

              {/* Pay Button */}
              <button
                onClick={initializePayment}
                disabled={
                  loading ||
                  amount < 1 ||
                  getSelectedMethods().length === 0 ||
                  !user
                }
                className="pay-button"
              >
                {loading ? "Processing..." : `Donate ₹${amount}`}
              </button>

              {/* Payment Status */}
              {paymentStatus && (
                <div className="status-card">
                  <div className="status-header">
                    {getStatusIcon()}
                    <h3>Payment Status</h3>
                    <button onClick={resetTest}>Reset</button>
                  </div>
                  <p className={`status-message ${paymentStatus}`}>
                    {getStatusMessage()}
                  </p>
                </div>
              )}

              {/* Success/Error Popup */}
              {showPopup && (
                <div
                  style={{
                    position: "fixed",
                    top: "20px",
                    right: "20px",
                    background:
                      paymentStatus === "success" ? "#4caf50" : "#f44336",
                    color: "white",
                    padding: "12px 20px",
                    borderRadius: "8px",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                    zIndex: 9999,
                    fontSize: "16px",
                    maxWidth: "300px",
                  }}
                >
                  {popupMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
