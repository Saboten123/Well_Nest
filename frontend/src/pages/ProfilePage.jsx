import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { blockchainApi } from "../utils/api.js";
import Navbar from "../components/Navbar.jsx";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
  useWatchContractEvent,
  useConnect,
  useDisconnect,
  useConnectors,
} from "wagmi";
import { formatEther } from "viem";
import contract from "../contractDesc/Token.json";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [blogs, setBlogs] = useState([]);
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [blogForm, setBlogForm] = useState({ title: "", body: "" });
  const [user, setUser] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isClaimingTokens, setIsClaimingTokens] = useState(false);
  const [userWalletAddress, setUserWalletAddress] = useState(null);
  const [isCheckingWallet, setIsCheckingWallet] = useState(false);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const [isManuallyDisconnected, setIsManuallyDisconnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [walletDisconnected, setWalletDisconnected] = useState(false); // Track if wallet was explicitly disconnected
  const [preventAutoConnect, setPreventAutoConnect] = useState(false); // Prevent auto-connect for this session

  // Wagmi hooks for wallet connection
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const connectors = useConnectors();

  // Get ETH balance
  const { data: balance } = useBalance({
    address: address,
  });

  // Get token balance
  const { data: tokenBalance } = useReadContract({
    address: contract?.address,
    abi: contract?.abi,
    functionName: "balanceOf",
    args: [address],
    enabled: !!address && !!contract?.address,
  });

  // Get claimable rewards
  const { data: claimableRewards, refetch: refetchClaimableRewards } =
    useReadContract({
      address: contract?.address,
      abi: contract?.abi,
      functionName: "getUserReward",
      args: [address],
      enabled: !!address && !!contract?.address,
    });

  // Contract write hook for claiming tokens
  const {
    writeContract,
    data: claimTxHash,
    isPending: isClaimPending,
    error: claimError,
  } = useWriteContract();

  // Wait for claim transaction receipt
  const { isLoading: isClaimTxLoading, isSuccess: isClaimTxSuccess } =
    useWaitForTransactionReceipt({
      hash: claimTxHash,
    });

  const navigate = useNavigate();

  // Clear wallet session storage keys that might persist wagmi state
  const clearWalletStorage = () => {
    try {
      // Clear wagmi and wallet-related localStorage/sessionStorage
      const keysToRemove = [];

      // Check localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.includes("wagmi") ||
            key.includes("wallet") ||
            key.includes("connector") ||
            key.includes("recentConnectorId"))
        ) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => {
        localStorage.removeItem(key);
        console.log(`Cleared localStorage key: ${key}`);
      });

      // Clear sessionStorage as well
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (
          key &&
          (key.includes("wagmi") ||
            key.includes("wallet") ||
            key.includes("connector"))
        ) {
          sessionKeysToRemove.push(key);
        }
      }

      sessionKeysToRemove.forEach((key) => {
        sessionStorage.removeItem(key);
        console.log(`Cleared sessionStorage key: ${key}`);
      });
    } catch (err) {
      console.error("Error clearing wallet storage:", err);
    }
  };

  // Force disconnect wallet with storage cleanup
  const forceDisconnectWallet = async () => {
    try {
      console.log("Force disconnecting wallet...");

      // First disconnect using wagmi
      if (isConnected) {
        disconnect();
      }

      // Clear all wallet-related storage
      clearWalletStorage();

      // Set flags to prevent reconnection
      setWalletDisconnected(true);
      setPreventAutoConnect(true);
      setIsManuallyDisconnected(true);
      setUserWalletAddress(null);

      // Store disconnection flag in localStorage to persist across page reloads
      localStorage.setItem("wallet_force_disconnected", "true");

      console.log("Wallet force disconnected and storage cleared");
    } catch (err) {
      console.error("Error force disconnecting wallet:", err);
    }
  };

  // Check if wallet was force disconnected in previous session
  useEffect(() => {
    const wasForceDisconnected = localStorage.getItem(
      "wallet_force_disconnected"
    );
    if (wasForceDisconnected === "true") {
      setWalletDisconnected(true);
      setPreventAutoConnect(true);
      setIsManuallyDisconnected(true);
      console.log("Wallet was force disconnected in previous session");
    }
  }, []);

  // Monitor wallet connection changes and enforce disconnection
  useEffect(() => {
    if (isConnected && (walletDisconnected || preventAutoConnect)) {
      console.log(
        "Wallet connected but should be disconnected - forcing disconnect"
      );
      setTimeout(() => {
        disconnect();
      }, 100);
    }
  }, [isConnected, walletDisconnected, preventAutoConnect, disconnect]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/signin");
      return;
    }
    fetchUser();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      const userId = user._id || user.id;

      // Check if this is a different user
      if (currentUserId && currentUserId !== userId) {
        console.log(`User switched from ${currentUserId} to ${userId}`);
        handleUserSwitch();
      }

      setCurrentUserId(userId);
      fetchProfile();

      if (user?.role === "ngo" || user?.role === "health_worker") {
        fetchBlogs();
      }

      // Only check wallet if not prevented and user hasn't changed
      if (!preventAutoConnect && (!currentUserId || currentUserId === userId)) {
        checkUserWalletAddress();
      }
    }
  }, [user, currentUserId, preventAutoConnect]);

  // Handle user switch
  const handleUserSwitch = async () => {
    console.log("Handling user switch - force disconnecting wallet");
    await forceDisconnectWallet();

    // Clear server wallet association for previous user
    try {
      await blockchainApi.patch("/reward/set", {
        walletAddress: null,
      });
    } catch (err) {
      console.error("Error clearing wallet on server during user switch:", err);
    }
  };

  // Handle wallet connection changes
  useEffect(() => {
    if (
      isConnected &&
      address &&
      user &&
      !preventAutoConnect &&
      !walletDisconnected
    ) {
      updateWalletAddressOnServer(address);
      setSuccess("Wallet connected successfully!");
      setShowWalletModal(false);
      setIsManuallyDisconnected(false);
      setTimeout(() => setSuccess(""), 3000);
    }
  }, [isConnected, address, user, preventAutoConnect, walletDisconnected]);

  // Handle successful claim transaction
  useEffect(() => {
    if (isClaimTxSuccess) {
      setSuccess("Tokens claimed successfully!");
      setIsClaimingTokens(false);
      refetchClaimableRewards();
      setTimeout(() => setSuccess(""), 5000);
    }
  }, [isClaimTxSuccess, refetchClaimableRewards]);

  // Handle claim transaction error
  useEffect(() => {
    if (claimError) {
      setError(`Failed to claim tokens: ${claimError.message}`);
      setIsClaimingTokens(false);
      setTimeout(() => setError(""), 5000);
    }
  }, [claimError]);

  // Modified auto-connect logic
  useEffect(() => {
    if (
      userWalletAddress &&
      !isConnected &&
      connectors.length > 0 &&
      !isAutoConnecting &&
      !isManuallyDisconnected &&
      !preventAutoConnect &&
      !walletDisconnected &&
      user
    ) {
      autoConnectWallet();
    }
  }, [
    userWalletAddress,
    isConnected,
    connectors,
    isAutoConnecting,
    isManuallyDisconnected,
    preventAutoConnect,
    walletDisconnected,
    user,
  ]);

  const fetchUser = async () => {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data.data.user);
    } catch (err) {
      console.error("Error fetching user:", err);
      navigate("/signin");
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get("/profile/me");
      setProfile(response.data.data.profile);
      setFormData(response.data.data.profile || {});
    } catch (err) {
      setError("Failed to fetch profile");
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlogs = async () => {
    try {
      const endpoint =
        user?.role === "ngo" ? "/ngo/blogs" : "/healthworker/blogs";
      const response = await api.get(endpoint);
      setBlogs(response.data.data || []);
    } catch (err) {
      console.error("Error fetching blogs:", err);
    }
  };

  const checkUserWalletAddress = async () => {
    if (!user || preventAutoConnect) return;

    try {
      setIsCheckingWallet(true);
      const response = await blockchainApi.get(
        `/user/wallet/${user._id || user.id}`
      );

      if (response.data.success && response.data.data.walletAddress) {
        setUserWalletAddress(response.data.data.walletAddress);
        console.log(
          "User has saved wallet address:",
          response.data.data.walletAddress
        );
      } else {
        setUserWalletAddress(null);
      }
    } catch (err) {
      console.log(
        "No wallet address found for user or server error:",
        err.message
      );
      setUserWalletAddress(null);
    } finally {
      setIsCheckingWallet(false);
    }
  };

  const updateWalletAddressOnServer = async (walletAddress) => {
    if (!user || !walletAddress) return;

    try {
      await blockchainApi.patch("/reward/set", {
        walletAddress: walletAddress,
      });

      setUserWalletAddress(walletAddress);
      console.log("Wallet address updated on server:", walletAddress);
    } catch (err) {
      console.error("Error updating wallet address on server:", err);

      if (
        err.response?.status === 409 ||
        err.response?.data?.code === "TRANSACTION_ALREADY_KNOWN"
      ) {
        setError(
          "Transaction already pending. Please wait for it to complete."
        );
      } else {
        setError("Failed to save wallet address");
      }
      setTimeout(() => setError(""), 5000);
    }
  };

  const autoConnectWallet = async () => {
    if (isAutoConnecting || preventAutoConnect || walletDisconnected) return;

    try {
      setIsAutoConnecting(true);
      console.log("Attempting to auto-connect wallet...");

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const injectedConnector = connectors.find(
        (connector) =>
          connector.type === "injected" ||
          connector.name.toLowerCase().includes("metamask")
      );

      if (injectedConnector) {
        await connect({ connector: injectedConnector });
        console.log("Auto-connected to wallet");
      }
    } catch (err) {
      console.log(
        "Auto-connect failed, user will need to connect manually:",
        err.message
      );
    } finally {
      setIsAutoConnecting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.patch(`/profile/${user.role}`, formData);
      setSuccess("Profile updated successfully!");
      setEditing(false);
      fetchProfile();
    } catch (err) {
      setError("Failed to update profile");
      console.error("Error updating profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlogSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint =
        user?.role === "ngo" ? "/ngo/blogs" : "/healthworker/blogs";
      await api.post(endpoint, blogForm);
      setSuccess("Blog added successfully!");
      setBlogForm({ title: "", body: "" });
      setShowBlogForm(false);
      fetchBlogs();
    } catch (err) {
      setError("Failed to add blog");
      console.error("Error adding blog:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBlogChange = (e) => {
    const { name, value } = e.target;
    setBlogForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Updated wallet connection function
  const handleConnectWallet = (connector) => {
    try {
      // Clear disconnection flags when user manually connects
      setWalletDisconnected(false);
      setPreventAutoConnect(false);
      setIsManuallyDisconnected(false);
      localStorage.removeItem("wallet_force_disconnected");

      connect({ connector });
    } catch (err) {
      setError("Failed to connect wallet");
      console.error("Wallet connection error:", err);
    }
  };

  // Updated wallet disconnection function
  const handleDisconnectWallet = async () => {
    try {
      await forceDisconnectWallet();

      // Clear wallet address from server
      if (user) {
        try {
          await blockchainApi.patch("/reward/set", {
            walletAddress: null,
          });
        } catch (err) {
          console.error("Error clearing wallet on server:", err);
        }
      }

      setSuccess("Wallet disconnected successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error disconnecting wallet:", err);
    }
  };

  const showWalletConnectionModal = () => {
    // Reset disconnection flags when user wants to connect
    setWalletDisconnected(false);
    setPreventAutoConnect(false);
    setIsManuallyDisconnected(false);
    localStorage.removeItem("wallet_force_disconnected");

    setShowWalletModal(true);
  };

  const handleClaimTokens = async () => {
    if (!address || !contract?.address) {
      setError("Wallet not connected or contract not available");
      return;
    }

    if (
      !claimableRewards ||
      claimableRewards === undefined ||
      claimableRewards === 0n
    ) {
      setError("No tokens available to claim");
      return;
    }

    try {
      setIsClaimingTokens(true);
      setError("");

      await writeContract({
        address: contract.address,
        abi: contract.abi,
        functionName: "claim",
        args: [],
      });
    } catch (err) {
      console.error("Error claiming tokens:", err);
      setError("Failed to initiate token claim");
      setIsClaimingTokens(false);
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getConnectorIcon = (connectorName) => {
    switch (connectorName.toLowerCase()) {
      case "metamask":
        return "🦊";
      case "walletconnect":
        return "🔗";
      case "coinbase wallet":
        return "🔷";
      case "injected":
        return "💳";
      default:
        return "👛";
    }
  };

  const getProfileFields = () => {
    switch (user?.role) {
      case "doctor":
        return [
          { name: "name", label: "Full Name", type: "text", required: true },
          {
            name: "specialization",
            label: "Specialization",
            type: "text",
            required: true,
          },
          {
            name: "licenseNumber",
            label: "License Number",
            type: "text",
            required: true,
          },
          {
            name: "affiliation",
            label: "Affiliation/Hospital",
            type: "text",
            required: true,
          },
          {
            name: "gender",
            label: "Gender",
            type: "select",
            options: ["Male", "Female", "Other"],
            required: true,
          },
          {
            name: "fee",
            label: "Consultation Fee",
            type: "number",
            required: true,
          },
        ];
      case "health_worker":
        return [
          { name: "name", label: "Full Name", type: "text", required: true },
          { name: "employer", label: "Employer", type: "text", required: true },
          {
            name: "certId",
            label: "Certification ID",
            type: "text",
            required: true,
          },
          { name: "region", label: "Region", type: "text", required: true },
        ];
      case "ngo":
        return [
          {
            name: "orgName",
            label: "Organization Name",
            type: "text",
            required: true,
          },
          {
            name: "registrationNumber",
            label: "Registration Number",
            type: "text",
            required: true,
          },
          {
            name: "mission",
            label: "Mission",
            type: "textarea",
            required: true,
          },
          { name: "website", label: "Website", type: "url", required: false },
          { name: "email", label: "Email", type: "email", required: true },
          {
            name: "services",
            label: "Services (comma separated)",
            type: "text",
            required: true,
          },
        ];
      case "patient":
        return [
          { name: "name", label: "Full Name", type: "text", required: true },
        ];
      default:
        return [];
    }
  };

  // Enhanced logout function
  const handleLogout = async () => {
    try {
      console.log("Logging out - force disconnecting wallet");

      // Force disconnect wallet and clear all storage
      await forceDisconnectWallet();

      // Clear wallet address from server
      // if (user) {
      //   try {
      //     await blockchainApi.patch("/reward/set", {
      //       walletAddress: null,
      //     });
      //   } catch (err) {
      //     console.error("Error clearing wallet on server during logout:", err);
      //   }
      // }

      // Reset all state
      setCurrentUserId(null);
      setError("");
      setSuccess("");

      // Clear authentication token and navigate
      localStorage.removeItem("token");
      navigate("/signin");
    } catch (err) {
      console.error("Error during logout:", err);
      // Still proceed with logout even if wallet disconnect fails
      localStorage.removeItem("token");
      navigate("/signin");
    }
  };

  const formatClaimableRewards = (rewards) => {
    if (!rewards || rewards === 0n || rewards === undefined) return "0";
    try {
      return parseFloat(formatEther(rewards)).toFixed(4);
    } catch (error) {
      console.error("Error formatting claimable rewards:", error);
      return "0";
    }
  };

  if (loading && !profile) {
    return (
      <div className="page">
        <Navbar onLogout={handleLogout} />
        <div className="page-content">
          <div className="section-header">
            <h1 className="section-title">Profile</h1>
            <p className="section-subtitle">Manage your profile information</p>
          </div>
          <div className="section-content">
            <div className="loading-spinner"></div>
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Navbar onLogout={handleLogout} />
      <div className="page-content">
        <div className="section-header">
          <h1 className="section-title">Profile</h1>
          <p className="section-subtitle">
            Complete your profile based on your role
          </p>
        </div>

        <div className="section-content">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div
            className="grid-2"
            style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
          >
            <div className="card">
              <div className="card-header">
                <div className="card-icon">👤</div>
                <h3 className="card-title">General Information</h3>
              </div>
              <div className="card-content">
                <div className="profile-info">
                  <div className="info-item">
                    <strong>Name:</strong>
                    <span>
                      {user?.firstName} {user?.lastName}
                    </span>
                  </div>
                  <div className="info-item">
                    <strong>Email:</strong>
                    <span>{user?.email}</span>
                  </div>
                  <div className="info-item">
                    <strong>Role:</strong>
                    <span className="badge badge-info">{user?.role}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-icon">📝</div>
                <h3 className="card-title">Role-Specific Information</h3>
                {!editing && (
                  <button
                    className="btn btn-outline btn-small"
                    onClick={() => setEditing(true)}
                  >
                    Edit Profile
                  </button>
                )}
              </div>
              <div className="card-content">
                {editing ? (
                  <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                      {getProfileFields().map((field) => (
                        <div key={field.name} className="form-group">
                          <label htmlFor={field.name}>
                            {field.label}
                            {field.required && (
                              <span className="required">*</span>
                            )}
                          </label>
                          {field.type === "select" ? (
                            <select
                              id={field.name}
                              name={field.name}
                              value={formData[field.name] || ""}
                              onChange={handleChange}
                              required={field.required}
                            >
                              <option value="">Select {field.label}</option>
                              {field.options.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : field.type === "textarea" ? (
                            <textarea
                              id={field.name}
                              name={field.name}
                              value={formData[field.name] || ""}
                              onChange={handleChange}
                              rows="3"
                              required={field.required}
                            />
                          ) : (
                            <input
                              id={field.name}
                              name={field.name}
                              type={field.type}
                              value={formData[field.name] || ""}
                              onChange={handleChange}
                              required={field.required}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="form-actions">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setEditing(false);
                          setFormData(profile || {});
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="profile-details">
                    {profile ? (
                      getProfileFields().map((field) => (
                        <div key={field.name} className="info-item">
                          <strong>{field.label}:</strong>
                          <span>{profile[field.name] || "Not specified"}</span>
                        </div>
                      ))
                    ) : (
                      <p>
                        No profile information available. Click "Edit Profile"
                        to add your details.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Wallet Management Section */}
            <div className="card">
              <div className="card-header">
                <div className="card-icon">💰</div>
                <h3 className="card-title">Wallet & Tokens</h3>
                {isConnected && !walletDisconnected && (
                  <button
                    className="btn btn-outline btn-small"
                    onClick={handleDisconnectWallet}
                  >
                    Disconnect
                  </button>
                )}
              </div>
              <div className="card-content">
                {isCheckingWallet && (
                  <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                    <p style={{ color: "#666" }}>
                      Checking for saved wallet...
                    </p>
                  </div>
                )}

                {isAutoConnecting && (
                  <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                    <p style={{ color: "#666" }}>
                      Auto-connecting wallet...
                    </p>
                  </div>
                )}

                {!isConnected || walletDisconnected ? (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ marginBottom: "1rem" }}>
                      <span style={{ fontSize: "2rem", color: "#ccc" }}>
                        🔗
                      </span>
                    </div>
                    <p style={{ color: "#666", marginBottom: "1rem" }}>
                      {walletDisconnected
                        ? "Wallet was disconnected for security"
                        : userWalletAddress && !preventAutoConnect
                        ? `Previous wallet: ${formatAddress(userWalletAddress)}`
                        : "Connect your wallet to view balance and claim tokens"}
                    </p>

                    <button
                      className="btn btn-primary"
                      onClick={showWalletConnectionModal}
                      style={{ width: "100%" }}
                      disabled={isAutoConnecting}
                    >
                      {isAutoConnecting
                        ? "Auto-connecting..."
                        : "Connect Wallet"}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div
                      className="wallet-info"
                      style={{ marginBottom: "1rem" }}
                    >
                      <div className="info-item">
                        <strong>Address:</strong>
                        <span className="badge badge-info">
                          {formatAddress(address)}
                        </span>
                      </div>
                      <div className="info-item">
                        <strong>ETH Balance:</strong>
                        <span>
                          {balance
                            ? parseFloat(formatEther(balance.value)).toFixed(4)
                            : "0.0000"}{" "}
                          ETH
                        </span>
                      </div>
                      {tokenBalance !== undefined && (
                        <div className="info-item">
                          <strong>WNT Balance:</strong>
                          <span>{formatEther(tokenBalance)} WNT</span>
                        </div>
                      )}
                      {claimableRewards !== undefined &&
                        claimableRewards > 0n && (
                          <div className="info-item">
                            <strong>Claimable Rewards:</strong>
                            <span className="badge badge-success">
                              {formatClaimableRewards(claimableRewards)} WNT
                            </span>
                          </div>
                        )}
                    </div>

                    {/* Claim Tokens Button */}
                    <div style={{ marginBottom: "1rem" }}>
                      <button
                        className="btn btn-primary"
                        onClick={handleClaimTokens}
                        disabled={
                          isClaimingTokens ||
                          isClaimPending ||
                          isClaimTxLoading ||
                          !claimableRewards ||
                          claimableRewards === undefined ||
                          claimableRewards === 0n
                        }
                        style={{ width: "100%" }}
                      >
                        {isClaimingTokens || isClaimPending || isClaimTxLoading
                          ? "Claiming Tokens..."
                          : !claimableRewards ||
                            claimableRewards === undefined ||
                            claimableRewards === 0n
                          ? "No Tokens to Claim"
                          : `Claim ${formatClaimableRewards(
                              claimableRewards
                            )} WNT`}
                      </button>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <p style={{ color: "#666", fontSize: "0.9rem" }}>
                        Wallet connected
                        {tokenBalance &&
                          " You can now interact with smart contracts."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Empty placeholder for grid layout */}
            <div></div>
          </div>

          {/* Blog Management for NGOs and Health Workers */}
          {(user?.role === "ngo" || user?.role === "health_worker") && (
            <div className="card" style={{ marginTop: "2rem" }}>
              <div className="card-header">
                <div className="card-icon">📰</div>
                <h3 className="card-title">Blog Management</h3>
                {!showBlogForm && (
                  <button
                    className="btn btn-outline btn-small"
                    onClick={() => setShowBlogForm(true)}
                  >
                    Add Blog
                  </button>
                )}
              </div>
              <div className="card-content">
                {showBlogForm ? (
                  <form onSubmit={handleBlogSubmit}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label htmlFor="blog-title">
                          Blog Title
                          <span className="required">*</span>
                        </label>
                        <input
                          id="blog-title"
                          name="title"
                          type="text"
                          value={blogForm.title}
                          onChange={handleBlogChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="blog-body">
                          Blog Content
                          <span className="required">*</span>
                        </label>
                        <textarea
                          id="blog-body"
                          name="body"
                          value={blogForm.body}
                          onChange={handleBlogChange}
                          rows="6"
                          required
                        />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary">
                        Publish Blog
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowBlogForm(false);
                          setBlogForm({ title: "", body: "" });
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    {blogs.length === 0 ? (
                      <p>
                        No blogs published yet. Click "Add Blog" to create your
                        first blog post.
                      </p>
                    ) : (
                      <div className="blogs-list">
                        <h4>Your Published Blogs ({blogs.length})</h4>
                        {blogs.map((blog, index) => (
                          <div key={index} className="blog-item">
                            <h5>{blog.title}</h5>
                            <p>{blog.body}</p>
                            <small>
                              Published:{" "}
                              {new Date(blog.createdAt).toLocaleDateString()}
                            </small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Wallet Connection Modal */}
      {showWalletModal && (
        <div
          className="wallet-modal-overlay"
          onClick={() => setShowWalletModal(false)}
        >
          <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wallet-modal-header">
              <h3>Choose a Wallet</h3>
              <button
                className="wallet-modal-close"
                onClick={() => setShowWalletModal(false)}
              >
                ×
              </button>
            </div>
            <div className="wallet-modal-content">
              <p>Select your preferred wallet to connect:</p>
              <div className="wallet-connectors-grid">
                {connectors.map((connector) => (
                  <button
                    key={connector.id}
                    className="wallet-connector-button"
                    onClick={() => handleConnectWallet(connector)}
                    disabled={isConnecting}
                  >
                    <div className="wallet-connector-icon">
                      {getConnectorIcon(connector.name)}
                    </div>
                    <div className="wallet-connector-info">
                      <span className="wallet-connector-name">
                        {connector.name}
                      </span>
                      <span className="wallet-connector-description">
                        {connector.name === "MetaMask" &&
                          "Connect using MetaMask"}
                        {connector.name === "WalletConnect" &&
                          "Scan with WalletConnect"}
                        {connector.name === "Coinbase Wallet" &&
                          "Connect with Coinbase"}
                        {connector.name === "Injected" && "Use browser wallet"}
                      </span>
                    </div>
                    {isConnecting && (
                      <div className="wallet-connecting-spinner">⟳</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
