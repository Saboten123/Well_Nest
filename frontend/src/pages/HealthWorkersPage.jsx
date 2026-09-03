import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api.js";
import Navbar from "../components/Navbar.jsx";

export default function HealthWorkersPage() {
  const [healthWorkers, setHealthWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [workerBlogs, setWorkerBlogs] = useState([]);
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/signin");
      return;
    }
    fetchHealthWorkers();
    fetchCurrentUser();
  }, [navigate]);

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get("/auth/me");
      setCurrentUser(response.data.data.user);
    } catch (err) {
      console.error("Error fetching current user:", err);
    }
  };

  const fetchHealthWorkers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/healthworker/list");
      setHealthWorkers(response.data.data || []);
    } catch (err) {
      setError("Failed to fetch health workers");
      console.error("Error fetching health workers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewBlogs = async (worker) => {
    setSelectedWorker(worker);
    setShowBlogModal(true);
    setLoadingBlogs(true);

    try {
      // Check if the current user is the owner of this health worker
      const isOwner =
        currentUser && worker.user && currentUser._id === worker.user._id;

      if (isOwner) {
        // If current user owns this health worker, fetch their blogs from their own endpoint
        const blogsResponse = await api.get("/healthworker/blogs");
        setWorkerBlogs(blogsResponse.data.data || []);
      } else {
        // If not the owner, fetch all health worker blogs and filter for this specific worker
        const allBlogsResponse = await api.get("/healthworker/all-blogs");
        const allBlogs = allBlogsResponse.data.data || [];

        // Filter blogs for this specific health worker
        const workerName = worker.user
          ? `${worker.user.firstName} ${worker.user.lastName}`
          : worker.name || "Health Worker";
        const filteredBlogs = allBlogs.filter(
          (blog) => blog.workerName === workerName
        );

        setWorkerBlogs(filteredBlogs);
      }
    } catch (err) {
      console.error("Error fetching health worker blogs:", err);
      setWorkerBlogs([]);
    } finally {
      setLoadingBlogs(false);
    }
  };

  const handleContact = (worker) => {
    setSelectedWorker(worker);
    setShowContactModal(true);
  };

  const closeBlogModal = () => {
    setShowBlogModal(false);
    setSelectedWorker(null);
    setWorkerBlogs([]);
  };

  const closeContactModal = () => {
    setShowContactModal(false);
    setSelectedWorker(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/signin");
  };

  if (loading) {
    return (
      <div className="page">
        <Navbar onLogout={handleLogout} />
        <div className="page-content">
          <div className="section-header">
            <h1 className="section-title">Health Workers</h1>
            <p className="section-subtitle">
              Connect with community health workers
            </p>
          </div>
          <div className="section-content">
            <div className="loading-spinner"></div>
            <p>Loading health workers...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <Navbar onLogout={handleLogout} />
        <div className="page-content">
          <div className="section-header">
            <h1 className="section-title">Health Workers</h1>
            <p className="section-subtitle">
              Connect with community health workers
            </p>
          </div>
          <div className="section-content">
            <div className="error-message">{error}</div>
            <button className="btn btn-primary" onClick={fetchHealthWorkers}>
              Try Again
            </button>
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
          <h1 className="section-title">Health Workers</h1>
          <p className="section-subtitle">
            Access community health workers for local healthcare support
          </p>
        </div>

        <div className="section-content">
          {healthWorkers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏥</div>
              <h3>No Health Workers Available</h3>
              <p>Check back later for available health workers.</p>
            </div>
          ) : (
            <div className="grid-3">
              {healthWorkers.map((worker, index) => {
                const isOwner =
                  currentUser &&
                  worker.user &&
                  currentUser._id === worker.user._id;
                return (
                  <div
                    key={worker._id || index}
                    className="card health-worker-card"
                  >
                    <div className="card-header">
                      <div className="card-icon">🏥</div>
                      <h3 className="card-title">
                        {worker.user
                          ? `${worker.user.firstName} ${worker.user.lastName}`
                          : worker.name || "Health Worker Name"}
                        {isOwner && (
                          <span
                            className="badge badge-info"
                            style={{ marginLeft: "0.5rem", fontSize: "0.7rem" }}
                          >
                            Your Profile
                          </span>
                        )}
                      </h3>
                    </div>
                    <div className="card-content">
                      <div className="worker-info">
                        <div className="info-item">
                          <strong>Employer:</strong>
                          <span>{worker.employer || "Organization Name"}</span>
                        </div>
                        {worker.about && (
                          <div className="info-item">
                            <strong>About:</strong>
                            <span>{worker.about}</span>
                          </div>
                        )}
                        {worker.region && (
                          <div className="info-item">
                            <strong>Region:</strong>
                            <span>{worker.region}</span>
                          </div>
                        )}
                        {worker.certId && (
                          <div className="info-item">
                            <strong>Certification ID:</strong>
                            <span>{worker.certId}</span>
                          </div>
                        )}
                      </div>
                      <div className="worker-actions">
                        <button
                          className="btn btn-primary btn-small"
                          onClick={() => handleContact(worker)}
                        >
                          Contact
                        </button>
                        <button
                          className="btn btn-outline btn-small"
                          onClick={() => handleViewBlogs(worker)}
                        >
                          {isOwner ? "View My Blogs" : "View Blogs"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && selectedWorker && (
        <div className="modal-overlay" onClick={closeContactModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                Contact{" "}
                {selectedWorker.user
                  ? `${selectedWorker.user.firstName} ${selectedWorker.user.lastName}`
                  : selectedWorker.name || "Health Worker"}
              </h3>
              <button className="modal-close" onClick={closeContactModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="contact-details">
                <div className="contact-item">
                  <div className="contact-icon">👨‍⚕️</div>
                  <div className="contact-info">
                    <strong>Health Worker:</strong>
                    <span>
                      {selectedWorker.user
                        ? `${selectedWorker.user.firstName} ${selectedWorker.user.lastName}`
                        : selectedWorker.name || "Not specified"}
                    </span>
                  </div>
                </div>

                {selectedWorker.employer && (
                  <div className="contact-item">
                    <div className="contact-icon">🏢</div>
                    <div className="contact-info">
                      <strong>Employer/Organization:</strong>
                      <span>{selectedWorker.employer}</span>
                    </div>
                  </div>
                )}

                {selectedWorker.certId && (
                  <div className="contact-item">
                    <div className="contact-icon">📜</div>
                    <div className="contact-info">
                      <strong>Certification ID:</strong>
                      <span>{selectedWorker.certId}</span>
                    </div>
                  </div>
                )}

                {selectedWorker.region && (
                  <div className="contact-item">
                    <div className="contact-icon">📍</div>
                    <div className="contact-info">
                      <strong>Service Region:</strong>
                      <span>{selectedWorker.region}</span>
                    </div>
                  </div>
                )}

                {selectedWorker.user?.email && (
                  <div className="contact-item">
                    <div className="contact-icon">📧</div>
                    <div className="contact-info">
                      <strong>Email:</strong>
                      <a
                        href={`mailto:${selectedWorker.user.email}`}
                        className="contact-link"
                      >
                        {selectedWorker.user.email}
                      </a>
                    </div>
                  </div>
                )}

                {selectedWorker.about && (
                  <div className="contact-item">
                    <div className="contact-icon">ℹ️</div>
                    <div className="contact-info">
                      <strong>About:</strong>
                      <span>{selectedWorker.about}</span>
                    </div>
                  </div>
                )}

                {selectedWorker.isProfileComplete && (
                  <div className="contact-item">
                    <div className="contact-icon">✅</div>
                    <div className="contact-info">
                      <strong>Profile Status:</strong>
                      <span className="badge badge-success">
                        Verified Profile
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="contact-actions">
                {selectedWorker.user?.email && (
                  <a
                    href={`mailto:${selectedWorker.user.email}`}
                    className="btn btn-primary"
                    style={{ textDecoration: "none" }}
                  >
                    📧 Send Email
                  </a>
                )}
                <button
                  className="btn btn-outline"
                  onClick={() => handleViewBlogs(selectedWorker)}
                >
                  📰 View Blogs
                </button>
              </div>

              {selectedWorker.region && (
                <div className="contact-note">
                  <p>
                    <small>
                      💡 <strong>Note:</strong> This health worker provides
                      services in the {selectedWorker.region} region.
                    </small>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Blog Modal */}
      {showBlogModal && (
        <div className="modal-overlay" onClick={closeBlogModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                Blogs by{" "}
                {selectedWorker?.user
                  ? `${selectedWorker.user.firstName} ${selectedWorker.user.lastName}`
                  : selectedWorker?.name || "Health Worker"}
              </h3>
              <button className="modal-close" onClick={closeBlogModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              {loadingBlogs ? (
                <div className="loading-spinner"></div>
              ) : workerBlogs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📰</div>
                  <h3>No Blogs Available</h3>
                  <p>
                    {currentUser &&
                    selectedWorker?.user &&
                    currentUser._id === selectedWorker.user._id
                      ? "You haven't published any blogs yet. Go to your Profile section to add blogs."
                      : "This health worker hasn't published any blogs yet."}
                  </p>
                </div>
              ) : (
                <div className="blogs-list">
                  {workerBlogs.map((blog, index) => (
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
          </div>
        </div>
      )}
    </div>
  );
}
