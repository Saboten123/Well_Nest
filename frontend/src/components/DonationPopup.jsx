import React, { useState } from "react";
import { X, DollarSign, Gift, QrCode } from "lucide-react";
import QRCode from "qrcode";
import "../styles/event-styles/DonationPopup.css";

const DonationPopup = ({ isOpen, onClose, eventDetails, onDonate }) => {
  const [amount, setAmount] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateQRCode = async (upiId, amount) => {
    try {
      const upiLink = `upi://pay?pa=${upiId}&am=${amount}&cu=INR&tn=Donation for ${eventDetails.eventType}`;
      const qrUrl = await QRCode.toDataURL(upiLink);
      return qrUrl;
    } catch (err) {
      console.error("Error generating QR code:", err);
      return null;
    }
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^\d+$/.test(value)) {
      setAmount(value);
      setError("");
    }
  };

  const handleGenerateQR = async () => {
    if (!amount || parseInt(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);
    const qrUrl = await generateQRCode(eventDetails.upiId, amount);
    if (qrUrl) {
      setQrCodeUrl(qrUrl);
      setShowQR(true);
    } else {
      setError("Failed to generate QR code");
    }
    setLoading(false);
  };

  const handleConfirmDonation = async () => {
    if (!amount || parseInt(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      setLoading(true);
      await onDonate(parseInt(amount));
      // Close popup on successful donation
      handleClose();
    } catch (err) {
      setError("Failed to process donation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount("");
    setQrCodeUrl("");
    setShowQR(false);
    setError("");
    setLoading(false);
    onClose();
  };

  const calculateRewardTokens = (donationAmount) => {
    // 1 token per 10 rupees donated
    return Math.floor(donationAmount / 10);
  };

  if (!isOpen) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-content donation-popup">
        <div className="popup-header">
          <h2>
            <DollarSign className="icon" />
            Donate to Event
          </h2>
          <button onClick={handleClose} className="close-btn">
            <X className="icon" />
          </button>
        </div>

        <div className="popup-body">
          <div className="event-info">
            <h3>{eventDetails.eventType}</h3>
            <p>
              Organized by: <strong>{eventDetails.organizerName}</strong>
            </p>
            <p>Location: {eventDetails.location}</p>
          </div>

          {!showQR ? (
            <div className="donation-form">
              <div className="form-field">
                <label htmlFor="amount">Donation Amount (₹)</label>
                <input
                  type="text"
                  id="amount"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="Enter amount"
                  className={error ? "error" : ""}
                />
                {error && <p className="error-text">{error}</p>}
              </div>

              {amount && parseInt(amount) > 0 && (
                <div className="reward-info">
                  <Gift className="icon small" />
                  <span>
                    You'll receive {calculateRewardTokens(parseInt(amount))}{" "}
                    reward tokens
                  </span>
                </div>
              )}

              <div className="donation-actions">
                <button
                  onClick={handleGenerateQR}
                  disabled={loading || !amount}
                  className="btn btn-primary"
                >
                  <QrCode className="icon small" />
                  {loading ? "Generating..." : "Generate QR Code"}
                </button>
              </div>
            </div>
          ) : (
            <div className="qr-section">
              <div className="qr-container">
                <img src={qrCodeUrl} alt="UPI QR Code" className="qr-code" />
              </div>
              <div className="qr-instructions">
                <h4>Scan to Pay ₹{amount}</h4>
                <p>1. Open any UPI app (GPay, PhonePe, Paytm, etc.)</p>
                <p>2. Scan the QR code above</p>
                <p>3. Complete the payment</p>
                <p>4. Click "Confirm Donation" below after payment</p>
              </div>

              <div className="qr-actions">
                <button
                  onClick={() => setShowQR(false)}
                  className="btn btn-outline"
                >
                  Back to Amount
                </button>
                <button
                  onClick={handleConfirmDonation}
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? "Processing..." : "Confirm Donation"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonationPopup;
