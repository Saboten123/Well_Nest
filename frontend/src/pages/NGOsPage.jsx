import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api.js";
import Navbar from "../components/Navbar.jsx";

export default function NGOsPage() {
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedNGO, setSelectedNGO] = useState(null);
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [ngoBlogs, setNgoBlogs] = useState([]);
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
    fetchNGOs();
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

  const fetchNGOs = async () => {
    try {
      setLoading(true);
      const response = await api.get("/ngos");
      setNgos(response.data.data.items || []);
    } catch (err) {
      setError("Failed to fetch NGOs");
      console.error("Error fetching NGOs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewBlogs = async (ngo) => {
    setSelectedNGO(ngo);
    setShowBlogModal(true);
    setLoadingBlogs(true);

    try {
      // Check if the current user is the owner of this NGO
      const isOwner =
        currentUser && ngo.user && currentUser._id === ngo.user._id;

      if (isOwner) {
        // If current user owns this NGO, fetch their blogs from their own endpoint
        const blogsResponse = await api.get("/ngo/blogs");
        setNgoBlogs(blogsResponse.data.data || []);
      } else {
        // If not the owner, fetch all NGO blogs and filter for this specific NGO
        const allBlogsResponse = await api.get("/ngo/all-blogs");
        const allBlogs = allBlogsResponse.data.data || [];

        // Filter blogs for this specific NGO
        const ngoName = ngo.user
          ? `${ngo.user.firstName} ${ngo.user.lastName}`
          : ngo.orgName || "NGO";
        const filteredBlogs = allBlogs.filter(
          (blog) => blog.ngoName === ngoName
        );

        setNgoBlogs(filteredBlogs);
      }
    } catch (err) {
      console.error("Error fetching NGO blogs:", err);
      setNgoBlogs([]);
    } finally {
      setLoadingBlogs(false);
    }
  };

  const handleContact = (ngo) => {
    setSelectedNGO(ngo);
    setShowContactModal(true);
  };

  const closeBlogModal = () => {
    setShowBlogModal(false);
    setSelectedNGO(null);
    setNgoBlogs([]);
  };

  const closeContactModal = () => {
    setShowContactModal(false);
    setSelectedNGO(null);
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
            <h1 className="section-title">NGOs</h1>
            <p className="section-subtitle">
              Connect with non-governmental organizations
            </p>
          </div>
          <div className="section-content">
            <div className="loading-spinner"></div>
            <p>Loading NGOs...</p>
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
            <h1 className="section-title">NGOs</h1>
            <p className="section-subtitle">
              Connect with non-governmental organizations
            </p>
          </div>
          <div className="section-content">
            <div className="error-message">{error}</div>
            <button className="btn btn-primary" onClick={fetchNGOs}>
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
          <h1 className="section-title">NGOs</h1>
          <p className="section-subtitle">
            Connect with non-governmental organizations
          </p>
        </div>

        <div className="section-content">
          {ngos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏛️</div>
              <h3>No NGOs Available</h3>
              <p>Check back later for available NGOs.</p>
            </div>
          ) : (
            <div className="grid-3">
              {ngos.map((ngo, index) => {
                const isOwner =
                  currentUser && ngo.user && currentUser._id === ngo.user._id;
                return (
                  <div key={ngo._id || index} className="card ngo-card">
                    <div className="card-header">
                      <div className="card-icon">🏛️</div>
                      <h3 className="card-title">
                        {ngo.user
                          ? `${ngo.user.firstName} ${ngo.user.lastName}`
                          : ngo.orgName || ngo.name || "NGO Name"}
                        {isOwner && (
                          <span
                            className="badge badge-info"
                            style={{ marginLeft: "0.5rem", fontSize: "0.7rem" }}
                          >
                            Your NGO
                          </span>
                        )}
                      </h3>
                    </div>
                    <div className="card-content">
                      <div className="ngo-info">
                        {ngo.mission && (
                          <div className="info-item">
                            <strong>Mission:</strong>
                            <span>{ngo.mission}</span>
                          </div>
                        )}
                        {ngo.services && (
                          <div className="info-item">
                            <strong>Services:</strong>
                            <span>{ngo.services}</span>
                          </div>
                        )}
                        {ngo.website && (
                          <div className="info-item">
                            <strong>Website:</strong>
                            <span>{ngo.website}</span>
                          </div>
                        )}
                        {ngo.email && (
                          <div className="info-item">
                            <strong>Email:</strong>
                            <span>{ngo.email}</span>
                          </div>
                        )}
                      </div>
                      <div className="ngo-actions">
                        <button
                          className="btn btn-primary btn-small"
                          onClick={() => handleContact(ngo)}
                        >
                          Contact
                        </button>
                        <button
                          className="btn btn-outline btn-small"
                          onClick={() => handleViewBlogs(ngo)}
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
      {showContactModal && selectedNGO && (
        <div className="modal-overlay" onClick={closeContactModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                Contact{" "}
                {selectedNGO.user
                  ? `${selectedNGO.user.firstName} ${selectedNGO.user.lastName}`
                  : selectedNGO.orgName || "NGO"}
              </h3>
              <button className="modal-close" onClick={closeContactModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="contact-details">
                <div className="contact-item">
                  <div className="contact-icon">🏛️</div>
                  <div className="contact-info">
                    <strong>Organization Name:</strong>
                    <span>
                      {selectedNGO.orgName ||
                        (selectedNGO.user
                          ? `${selectedNGO.user.firstName} ${selectedNGO.user.lastName}`
                          : "Not specified")}
                    </span>
                  </div>
                </div>

                {selectedNGO.registrationNumber && (
                  <div className="contact-item">
                    <div className="contact-icon">📋</div>
                    <div className="contact-info">
                      <strong>Registration Number:</strong>
                      <span>{selectedNGO.registrationNumber}</span>
                    </div>
                  </div>
                )}

                {selectedNGO.email && (
                  <div className="contact-item">
                    <div className="contact-icon">📧</div>
                    <div className="contact-info">
                      <strong>Email:</strong>
                      <a
                        href={`mailto:${selectedNGO.email}`}
                        className="contact-link"
                      >
                        {selectedNGO.email}
                      </a>
                    </div>
                  </div>
                )}

                {selectedNGO.website && (
                  <div className="contact-item">
                    <div className="contact-icon">🌐</div>
                    <div className="contact-info">
                      <strong>Website:</strong>
                      <a
                        href={
                          selectedNGO.website.startsWith("http")
                            ? selectedNGO.website
                            : `https://${selectedNGO.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="contact-link"
                      >
                        {selectedNGO.website}
                      </a>
                    </div>
                  </div>
                )}

                {selectedNGO.mission && (
                  <div className="contact-item">
                    <div className="contact-icon">🎯</div>
                    <div className="contact-info">
                      <strong>Mission:</strong>
                      <span>{selectedNGO.mission}</span>
                    </div>
                  </div>
                )}

                {selectedNGO.services && (
                  <div className="contact-item">
                    <div className="contact-icon">🛠️</div>
                    <div className="contact-info">
                      <strong>Services:</strong>
                      <span>{selectedNGO.services}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="contact-actions">
                {selectedNGO.email && (
                  <a
                    href={`mailto:${selectedNGO.email}`}
                    className="btn btn-primary"
                    style={{ textDecoration: "none" }}
                  >
                    📧 Send Email
                  </a>
                )}
                {selectedNGO.website && (
                  <a
                    href={
                      selectedNGO.website.startsWith("http")
                        ? selectedNGO.website
                        : `https://${selectedNGO.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                    style={{ textDecoration: "none" }}
                  >
                    🌐 Visit Website
                  </a>
                )}
              </div>
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
                {selectedNGO?.user
                  ? `${selectedNGO.user.firstName} ${selectedNGO.user.lastName}`
                  : selectedNGO?.orgName || "NGO"}
              </h3>
              <button className="modal-close" onClick={closeBlogModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              {loadingBlogs ? (
                <div className="loading-spinner"></div>
              ) : ngoBlogs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📰</div>
                  <h3>No Blogs Available</h3>
                  <p>
                    {currentUser &&
                    selectedNGO?.user &&
                    currentUser._id === selectedNGO.user._id
                      ? "You haven't published any blogs yet. Go to your Profile section to add blogs."
                      : "This NGO hasn't published any blogs yet."}
                  </p>
                </div>
              ) : (
                <div className="blogs-list">
                  {ngoBlogs.map((blog, index) => (
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
