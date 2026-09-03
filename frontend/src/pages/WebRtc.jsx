import React, { useState, useEffect, useRef } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Monitor,
  Users,
  MessageCircle,
  Settings,
  Copy,
  Check,
} from "lucide-react";
import io from "socket.io-client";
import api from "../utils/api"; // Import the main api instance
import { getToken } from "../utils/auth"; // Import auth utility
import "./WebRtc.css";

const WebRTCVideoCall = () => {
  // State management
  const [roomId, setRoomId] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [isInCall, setIsInCall] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callError, setCallError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [copied, setCopied] = useState(false);

  // Refs
  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnections = useRef(new Map());
  const remoteVideoRefs = useRef(new Map());

  // WebRTC configuration
  const pcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  // Initialize socket connection
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setCallError("Authentication required");
      return;
    }

    console.log("Token for Socket.IO:", token ? "Token exists" : "No token");

    // Note: Socket.IO connection still uses port 5000 for WebSocket server
    // This is separate from the REST API which uses axios
    socketRef.current = io("http://localhost:5000", {
      auth: { token },
      transports: ["websocket", "polling"], // Add fallback transport
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      setConnectionStatus("connected");
      setCallError("");
    });

    socket.on("connect_error", (error) => {
      setConnectionStatus("error");
      console.error("Socket connection error:", error);
      setCallError(`Connection failed: ${error.message}`);

      // If it's an auth error, try to refresh the page or redirect to login
      if (error.message.includes("Authentication failed")) {
        console.log("Authentication failed - token might be invalid");
        // Optionally redirect to login or clear token
        // localStorage.removeItem('token');
        // window.location.href = '/signin';
      }
    });

    socket.on("room-users", (users) => {
      setParticipants(users);
    });

    socket.on("user-joined", handleUserJoined);
    socket.on("user-left", handleUserLeft);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("call-ended", handleCallEnded);
    socket.on("screen-share-start", handleScreenShareStart);
    socket.on("screen-share-stop", handleScreenShareStop);
    socket.on("call-chat-message", handleChatMessage);
    socket.on("user-media-state-change", handleMediaStateChange);

    return () => {
      socket.disconnect();
    };
  }, []);

  // Generate unique room ID
  const generateRoomId = () => {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  };

  // Create new call session
  const createCall = async () => {
    try {
      setIsConnecting(true);
      const newRoomId = generateRoomId();

      // Create session in backend using axios
      // Option 1: Don't send appointmentId if it's temporary
      const response = await api.post("/video-call/create", {
        // appointmentId: null, // or omit this field entirely
        participantIds: [localStorage.getItem("userId") || "current-user"],
        callType: "video",
        roomId: newRoomId, // Send the room ID instead
      });

      if (response.data.success) {
        setRoomId(newRoomId);
        await joinRoom(newRoomId);
      } else {
        throw new Error(response.data.message || "Failed to create call");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to create call";
      setCallError(`Failed to create call: ${errorMessage}`);
      setIsConnecting(false);
    }
  };

  // Join existing room
  const joinCall = async () => {
    if (!joinRoomId.trim()) {
      setCallError("Please enter a room ID");
      return;
    }
    await joinRoom(joinRoomId);
  };

  // Join room logic
  const joinRoom = async (roomIdToJoin) => {
    try {
      setIsConnecting(true);

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Get appointment context if available
      const appointmentData = JSON.parse(
        localStorage.getItem("currentAppointment") || "{}"
      );

      // Join room via socket
      socketRef.current.emit("join-room", {
        roomId: roomIdToJoin,
        appointmentId: appointmentData.appointmentId || null,
        userRole: appointmentData.userRole || "unknown",
        userName:
          appointmentData.userRole === "doctor"
            ? appointmentData.doctorName
            : appointmentData.patientName,
      });

      setIsInCall(true);
      setRoomId(roomIdToJoin);
      setIsConnecting(false);
      setCallError("");
    } catch (error) {
      setCallError(`Failed to join call: ${error.message}`);
      setIsConnecting(false);
    }
  };

  // Handle new user joining
  const handleUserJoined = async (data) => {
    const { userId, socketId } = data;

    // Create peer connection for new user
    const pc = new RTCPeerConnection(pcConfig);
    peerConnections.current.set(socketId, pc);

    // Add local stream to peer connection
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle incoming stream
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStreams((prev) => new Map(prev.set(socketId, stream)));
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("ice-candidate", {
          roomId,
          candidate: event.candidate,
          targetUserId: userId,
        });
      }
    };

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketRef.current.emit("offer", {
      roomId,
      offer,
      targetUserId: userId,
    });
  };

  // Handle user leaving
  const handleUserLeft = (data) => {
    const { userId } = data;
    setParticipants((prev) => prev.filter((p) => p.userId !== userId));
  };

  // Handle WebRTC offer
  const handleOffer = async (data) => {
    const { offer, fromUserId, fromSocketId } = data;

    const pc = new RTCPeerConnection(pcConfig);
    peerConnections.current.set(fromSocketId, pc);

    // Add local stream
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle incoming stream
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStreams((prev) => new Map(prev.set(fromSocketId, stream)));
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("ice-candidate", {
          roomId,
          candidate: event.candidate,
          targetUserId: fromUserId,
        });
      }
    };

    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socketRef.current.emit("answer", {
      roomId,
      answer,
      targetUserId: fromUserId,
    });
  };

  // Handle WebRTC answer
  const handleAnswer = async (data) => {
    const { answer, fromSocketId } = data;
    const pc = peerConnections.current.get(fromSocketId);
    if (pc) {
      await pc.setRemoteDescription(answer);
    }
  };

  // Handle ICE candidates
  const handleIceCandidate = (data) => {
    const { candidate, fromSocketId } = data;
    const pc = peerConnections.current.get(fromSocketId);
    if (pc) {
      pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  // Handle call ended
  const handleCallEnded = () => {
    endCall();
  };

  // Handle screen sharing
  const handleScreenShareStart = (data) => {
    // Handle when someone starts screen sharing
  };

  const handleScreenShareStop = (data) => {
    // Handle when someone stops screen sharing
  };

  // Handle chat messages
  const handleChatMessage = (data) => {
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        from: data.fromUserId,
        message: data.message,
        timestamp: new Date(data.timestamp),
      },
    ]);
  };

  // Handle media state changes
  const handleMediaStateChange = (data) => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.userId === data.userId
          ? {
              ...p,
              audioEnabled: data.audioEnabled,
              videoEnabled: data.videoEnabled,
            }
          : p
      )
    );
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);

        socketRef.current.emit("media-state-change", {
          roomId,
          audioEnabled: isAudioEnabled,
          videoEnabled: videoTrack.enabled,
        });
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);

        socketRef.current.emit("media-state-change", {
          roomId,
          audioEnabled: audioTrack.enabled,
          videoEnabled: isVideoEnabled,
        });
      }
    }
  };

  // Toggle screen sharing
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        const videoTrack = screenStream.getVideoTracks()[0];
        peerConnections.current.forEach((pc) => {
          const sender = pc
            .getSenders()
            .find((s) => s.track && s.track.kind === "video");
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        setIsScreenSharing(true);
        socketRef.current.emit("screen-share-start", { roomId });

        screenStream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };
      } else {
        stopScreenShare();
      }
    } catch (error) {
      setCallError("Screen sharing failed");
    }
  };

  // Stop screen sharing
  const stopScreenShare = async () => {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      const videoTrack = videoStream.getVideoTracks()[0];

      peerConnections.current.forEach((pc) => {
        const sender = pc
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      setIsScreenSharing(false);
      socketRef.current.emit("screen-share-stop", { roomId });
    } catch (error) {
      setCallError("Failed to stop screen sharing");
    }
  };

  // Send chat message
  const sendMessage = () => {
    if (newMessage.trim()) {
      socketRef.current.emit("call-chat-message", {
        roomId,
        message: newMessage,
        timestamp: new Date().toISOString(),
      });

      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          from: "You",
          message: newMessage,
          timestamp: new Date(),
        },
      ]);

      setNewMessage("");
    }
  };

  // End call
  const endCall = () => {
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    // Close all peer connections
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();

    // Clear streams
    setLocalStream(null);
    setRemoteStreams(new Map());

    // Emit end call event
    if (socketRef.current && roomId) {
      socketRef.current.emit("end-call", { roomId });
    }

    // Reset state
    setIsInCall(false);
    setRoomId("");
    setParticipants([]);
    setChatMessages([]);
    setCallError("");
  };

  // Copy room ID to clipboard
  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      setCallError("Failed to copy room ID");
    }
  };

  if (!isInCall) {
    // Check if coming from appointment
    const appointmentData = JSON.parse(
      localStorage.getItem("currentAppointment") || "{}"
    );
    const isFromAppointment = appointmentData.appointmentId;

    return (
      <div className="webrtc-container">
        <div className="webrtc-card">
          <div className="webrtc-header">
            <div className="webrtc-icon">
              <Video className="webrtc-icon-video" />
            </div>
            <h1 className="webrtc-title">Video Call</h1>
            <p className="webrtc-subtitle">
              {isFromAppointment
                ? `Video consultation with ${
                    appointmentData.userRole === "doctor"
                      ? appointmentData.patientName
                      : appointmentData.doctorName
                  }`
                : "Start a new call or join an existing one"}
            </p>
          </div>

          {callError && (
            <div className="webrtc-error">
              <p className="webrtc-error-text">{callError}</p>
            </div>
          )}

          <div className="webrtc-actions">
            {/* Create New Call - Show for appointments or standalone */}
            <div className="webrtc-action-group">
              <h3 className="webrtc-action-title">
                {isFromAppointment
                  ? "Start Appointment Call"
                  : "Start New Call"}
              </h3>
              <button
                onClick={createCall}
                disabled={isConnecting}
                className={`webrtc-btn webrtc-btn-primary ${
                  isConnecting ? "webrtc-btn-disabled" : ""
                }`}
              >
                {isConnecting ? (
                  <>
                    <div className="webrtc-spinner"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Video className="webrtc-btn-icon" />
                    {isFromAppointment ? "Start Consultation" : "Create Room"}
                  </>
                )}
              </button>
            </div>

            {/* Join Existing Call - Only show for standalone calls */}
            {!isFromAppointment && (
              <div className="webrtc-action-group">
                <h3 className="webrtc-action-title">Join Existing Call</h3>
                <div className="webrtc-join-form">
                  <input
                    type="text"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    placeholder="Enter Room ID"
                    className="webrtc-input"
                  />
                  <button
                    onClick={joinCall}
                    disabled={isConnecting || !joinRoomId.trim()}
                    className={`webrtc-btn webrtc-btn-success ${
                      isConnecting || !joinRoomId.trim()
                        ? "webrtc-btn-disabled"
                        : ""
                    }`}
                  >
                    {isConnecting ? (
                      <>
                        <div className="webrtc-spinner"></div>
                        Joining...
                      </>
                    ) : (
                      <>
                        <Phone className="webrtc-btn-icon" />
                        Join Call
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Back to appointments button */}
            {isFromAppointment && (
              <div className="webrtc-action-group">
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    localStorage.removeItem("currentAppointment");
                    window.history.back();
                  }}
                >
                  ← Back to Appointments
                </button>
              </div>
            )}
          </div>

          <div className="webrtc-status">
            <p className="webrtc-status-text">
              Connection Status:
              <span
                className={`webrtc-status-indicator webrtc-status-${connectionStatus}`}
              >
                {connectionStatus}
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="webrtc-call-container">
      {/* Header */}
      <div className="webrtc-call-header">
        <div className="webrtc-call-header-content">
          <div className="webrtc-call-info">
            <h1 className="webrtc-call-title">Video Call</h1>
            <div className="webrtc-room-info">
              <span className="webrtc-room-label">Room:</span>
              <span className="webrtc-room-id">{roomId}</span>
              <button onClick={copyRoomId} className="webrtc-copy-btn">
                {copied ? (
                  <Check className="webrtc-copy-icon webrtc-copy-success" />
                ) : (
                  <Copy className="webrtc-copy-icon" />
                )}
              </button>
            </div>
          </div>
          <div className="webrtc-call-meta">
            <div className="webrtc-participants-count">
              <Users className="webrtc-participants-icon" />
              <span className="webrtc-participants-number">
                {participants.length + 1}
              </span>
            </div>
            <button
              onClick={() => setShowChat(!showChat)}
              className="webrtc-chat-toggle"
            >
              <MessageCircle className="webrtc-chat-icon" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="webrtc-call-main">
        {/* Video Area */}
        <div className="webrtc-video-area">
          {/* Remote Videos Grid */}
          <div className="webrtc-remote-videos">
            {Array.from(remoteStreams.entries()).map(([socketId, stream]) => (
              <div key={socketId} className="webrtc-remote-video-container">
                <video
                  ref={(el) => {
                    if (el && stream) {
                      el.srcObject = stream;
                      el.play().catch(console.error);
                    }
                  }}
                  className="webrtc-remote-video"
                  autoPlay
                  playsInline
                />
              </div>
            ))}
            {remoteStreams.size === 0 && (
              <div className="webrtc-waiting-message">
                <div className="webrtc-waiting-content">
                  <Users className="webrtc-waiting-icon" />
                  <p>Waiting for others to join...</p>
                </div>
              </div>
            )}
          </div>

          {/* Local Video (Picture-in-Picture) */}
          <div className="webrtc-local-video-container">
            <video
              ref={localVideoRef}
              className="webrtc-local-video"
              autoPlay
              playsInline
              muted
            />
            <div className="webrtc-local-video-label">
              <span>You</span>
            </div>
          </div>
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="webrtc-chat-panel">
            <div className="webrtc-chat-header">
              <h3 className="webrtc-chat-title">Chat</h3>
            </div>
            <div className="webrtc-chat-messages">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="webrtc-chat-message">
                  <span className="webrtc-chat-sender">{msg.from}: </span>
                  <span className="webrtc-chat-text">{msg.message}</span>
                </div>
              ))}
            </div>
            <div className="webrtc-chat-input-container">
              <div className="webrtc-chat-input-wrapper">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="webrtc-chat-input"
                />
                <button onClick={sendMessage} className="webrtc-chat-send">
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="webrtc-controls">
        <div className="webrtc-controls-content">
          <button
            onClick={toggleAudio}
            className={`webrtc-control-btn ${
              isAudioEnabled
                ? "webrtc-control-btn-active"
                : "webrtc-control-btn-muted"
            }`}
          >
            {isAudioEnabled ? (
              <Mic className="webrtc-control-icon" />
            ) : (
              <MicOff className="webrtc-control-icon" />
            )}
          </button>

          <button
            onClick={toggleVideo}
            className={`webrtc-control-btn ${
              isVideoEnabled
                ? "webrtc-control-btn-active"
                : "webrtc-control-btn-muted"
            }`}
          >
            {isVideoEnabled ? (
              <Video className="webrtc-control-icon" />
            ) : (
              <VideoOff className="webrtc-control-icon" />
            )}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`webrtc-control-btn ${
              isScreenSharing
                ? "webrtc-control-btn-sharing"
                : "webrtc-control-btn-active"
            }`}
          >
            <Monitor className="webrtc-control-icon" />
          </button>

          <button
            onClick={endCall}
            className="webrtc-control-btn webrtc-control-btn-end"
          >
            <PhoneOff className="webrtc-control-icon" />
          </button>
        </div>
      </div>

      {callError && <div className="webrtc-error-toast">{callError}</div>}
    </div>
  );
};

export default WebRTCVideoCall;
