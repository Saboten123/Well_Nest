import React, { useState, useEffect } from "react";
import api from "../../utils/api.js";

export default function NGOsSection() {
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedNGO, setSelectedNGO] = useState(null);
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [ngoBlogs, setNgoBlogs] = useState([]);
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchNGOs();
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
      const isOwner = currentUser && ngo.user && currentUser._id === ngo.user._id;
      
      if (isOwner) {
        // If current user owns this NGO, fetch their blogs from their own endpoint
        const blogsResponse = await api.get("/ngo/blogs");
        setNgoBlogs(blogsResponse.data.data || []);
      } else {
        // If not the owner, fetch all NGO blogs and filter for this specific NGO
        const allBlogsResponse = await api.get("/ngo/all-blogs");
        const allBlogs = allBlogsResponse.data.data || [];
        
        // Filter blogs for this specific NGO
        const ngoName = ngo.user ? `${ngo.user.firstName} ${ngo.user.lastName}` : ngo.orgName || "NGO";
        const filteredBlogs = allBlogs.filter(blog => blog.ngoName === ngoName);
        
        setNgoBlogs(filteredBlogs);
      }
    } catch (err) {
      console.error("Error fetching NGO blogs:", err);
      setNgoBlogs([]);
    } finally {
      setLoadingBlogs(false);
    }
  };

  const closeBlogModal = () => {
    setShowBlogModal(false);
    setSelectedNGO(null);
    setNgoBlogs([]);
  };

  if (loading) {
    return (
      <div>
        <div className="section-header">
          <h1 className="section-title">NGOs</h1>
          <p className="section-subtitle">Discover NGOs providing healthcare services</p>
        </div>
        <div className="section-content">
          <div className="loading-spinner"></div>
          <p>Loading NGOs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="section-header">
          <h1 className="section-title">NGOs</h1>
          <p className="section-subtitle">Discover NGOs providing healthcare services</p>
        </div>
        <div className="section-content">
          <div className="error-message">{error}</div>
          <button className="btn btn-primary" onClick={fetchNGOs}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">NGOs</h1>
        <p className="section-subtitle">Discover NGOs providing healthcare services and support</p>
      </div>

      <div className="section-content">
        {ngos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🤝</div>
            <h3>No NGOs Available</h3>
            <p>Check back later for available NGOs.</p>
          </div>
        ) : (
          <div className="grid-2">
            {ngos.map((ngo, index) => {
              const isOwner = currentUser && ngo.user && currentUser._id === ngo.user._id;
              return (
                <div key={ngo._id || index} className="card ngo-card">
                  <div className="card-header">
                    <div className="card-icon">🤝</div>
                    <h3 className="card-title">
                      {ngo.user ? `${ngo.user.firstName} ${ngo.user.lastName}` : ngo.orgName || ngo.name || "NGO Name"}
                      {isOwner && <span className="badge badge-info" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>Your NGO</span>}
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
                          <a href={ngo.website} target="_blank" rel="noopener noreferrer" className="link">
                            {ngo.website}
                          </a>
                        </div>
                      )}
                      {ngo.email && (
                        <div className="info-item">
                          <strong>Email:</strong>
                          <a href={`mailto:${ngo.email}`} className="link">
                            {ngo.email}
                          </a>
                        </div>
                      )}
                      {ngo.regNo && (
                        <div className="info-item">
                          <strong>Registration No:</strong>
                          <span>{ngo.regNo}</span>
                        </div>
                      )}
                    </div>
                    <div className="ngo-actions">
                      <button className="btn btn-primary btn-small">
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

      {/* Blog Modal */}
      {showBlogModal && (
        <div className="modal-overlay" onClick={closeBlogModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Blogs by {selectedNGO?.user ? `${selectedNGO.user.firstName} ${selectedNGO.user.lastName}` : selectedNGO?.orgName || "NGO"}</h3>
              <button className="modal-close" onClick={closeBlogModal}>×</button>
            </div>
            <div className="modal-body">
              {loadingBlogs ? (
                <div className="loading-spinner"></div>
              ) : ngoBlogs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📰</div>
                  <h3>No Blogs Available</h3>
                  <p>
                    {currentUser && selectedNGO?.user && currentUser._id === selectedNGO.user._id 
                      ? "You haven't published any blogs yet. Go to your Profile section to add blogs."
                      : "This NGO hasn't published any blogs yet."
                    }
                  </p>
                </div>
              ) : (
                <div className="blogs-list">
                  {ngoBlogs.map((blog, index) => (
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
