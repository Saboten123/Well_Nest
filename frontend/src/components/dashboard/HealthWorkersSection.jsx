import React, { useState, useEffect } from "react";
import api from "../../utils/api.js";

export default function HealthWorkersSection() {
  const [healthWorkers, setHealthWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [workerBlogs, setWorkerBlogs] = useState([]);
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchHealthWorkers();
    fetchCurrentUser();
  }, []);

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
      const isOwner = currentUser && worker.user && currentUser._id === worker.user._id;
      
      if (isOwner) {
        // If current user owns this health worker, fetch their blogs from their own endpoint
        const blogsResponse = await api.get("/healthworker/blogs");
        setWorkerBlogs(blogsResponse.data.data || []);
      } else {
        // If not the owner, fetch all health worker blogs and filter for this specific worker
        const allBlogsResponse = await api.get("/healthworker/all-blogs");
        const allBlogs = allBlogsResponse.data.data || [];
        
        // Filter blogs for this specific health worker
        const workerName = worker.user ? `${worker.user.firstName} ${worker.user.lastName}` : worker.name || "Health Worker";
        const filteredBlogs = allBlogs.filter(blog => blog.workerName === workerName);
        
        setWorkerBlogs(filteredBlogs);
      }
    } catch (err) {
      console.error("Error fetching health worker blogs:", err);
      setWorkerBlogs([]);
    } finally {
      setLoadingBlogs(false);
    }
  };

  const closeBlogModal = () => {
    setShowBlogModal(false);
    setSelectedWorker(null);
    setWorkerBlogs([]);
  };

  if (loading) {
    return (
      <div>
        <div className="section-header">
          <h1 className="section-title">Health Workers</h1>
          <p className="section-subtitle">Connect with community health workers</p>
        </div>
        <div className="section-content">
          <div className="loading-spinner"></div>
          <p>Loading health workers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="section-header">
          <h1 className="section-title">Health Workers</h1>
          <p className="section-subtitle">Connect with community health workers</p>
        </div>
        <div className="section-content">
          <div className="error-message">{error}</div>
          <button className="btn btn-primary" onClick={fetchHealthWorkers}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Health Workers</h1>
        <p className="section-subtitle">Access community health workers for local healthcare support</p>
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
              const isOwner = currentUser && worker.user && currentUser._id === worker.user._id;
              return (
                <div key={worker._id || index} className="card health-worker-card">
                  <div className="card-header">
                    <div className="card-icon">🏥</div>
                    <h3 className="card-title">
                      {worker.user ? `${worker.user.firstName} ${worker.user.lastName}` : worker.name || "Health Worker Name"}
                      {isOwner && <span className="badge badge-info" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>Your Profile</span>}
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
                      <button className="btn btn-primary btn-small">
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

      {/* Blog Modal */}
      {showBlogModal && (
        <div className="modal-overlay" onClick={closeBlogModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Blogs by {selectedWorker?.user ? `${selectedWorker.user.firstName} ${selectedWorker.user.lastName}` : selectedWorker?.name || "Health Worker"}</h3>
              <button className="modal-close" onClick={closeBlogModal}>×</button>
            </div>
            <div className="modal-body">
              {loadingBlogs ? (
                <div className="loading-spinner"></div>
              ) : workerBlogs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📰</div>
                  <h3>No Blogs Available</h3>
                  <p>
                    {currentUser && selectedWorker?.user && currentUser._id === selectedWorker.user._id 
                      ? "You haven't published any blogs yet. Go to your Profile section to add blogs."
                      : "This health worker hasn't published any blogs yet."
                    }
                  </p>
                </div>
              ) : (
                <div className="blogs-list">
                  {workerBlogs.map((blog, index) => (
                    <div key={index} className="blog-item">
                      <h5>{blog.title}</h5>
                      <p>{blog.body}</p>
                      <small>
                        Published: {new Date(blog.createdAt).toLocaleDateString()}
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
