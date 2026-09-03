import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api.js";
import Navbar from "../components/Navbar.jsx";

export default function BlogsPage() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all, ngo, health_worker
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/signin");
      return;
    }
    fetchAllBlogs();
  }, [navigate]);

  const fetchAllBlogs = async () => {
    try {
      setLoading(true);
      
      // Fetch both NGO and Health Worker blogs
      const [ngoBlogsResponse, healthWorkerBlogsResponse] = await Promise.all([
        api.get("/ngo/all-blogs"),
        api.get("/healthworker/all-blogs")
      ]);

      const ngoBlogs = ngoBlogsResponse.data.data || [];
      const healthWorkerBlogs = healthWorkerBlogsResponse.data.data || [];

      // Combine and format all blogs
      const allBlogs = [
        ...ngoBlogs.map(blog => ({
          ...blog,
          source: "NGO",
          sourceName: blog.ngoName,
          sourceIcon: "🏛️"
        })),
        ...healthWorkerBlogs.map(blog => ({
          ...blog,
          source: "Health Worker",
          sourceName: blog.workerName,
          sourceIcon: "🏥"
        }))
      ];

      // Sort by creation date (newest first)
      allBlogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setBlogs(allBlogs);
    } catch (err) {
      setError("Failed to fetch blogs");
      console.error("Error fetching blogs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/signin");
  };

  const filteredBlogs = blogs.filter(blog => {
    if (filter === "all") return true;
    if (filter === "ngo") return blog.source === "NGO";
    if (filter === "health_worker") return blog.source === "Health Worker";
    return true;
  });

  if (loading) {
    return (
      <div className="page">
        <Navbar onLogout={handleLogout} />
        <div className="page-content">
          <div className="section-header">
            <h1 className="section-title">Health Blogs</h1>
            <p className="section-subtitle">Stay informed with healthcare insights and updates</p>
          </div>
          <div className="section-content">
            <div className="loading-spinner"></div>
            <p>Loading blogs...</p>
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
            <h1 className="section-title">Health Blogs</h1>
            <p className="section-subtitle">Stay informed with healthcare insights and updates</p>
          </div>
          <div className="section-content">
            <div className="error-message">{error}</div>
            <button className="btn btn-primary" onClick={fetchAllBlogs}>
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
          <h1 className="section-title">Health Blogs</h1>
          <p className="section-subtitle">Stay informed with healthcare insights and updates</p>
        </div>

        <div className="section-content">
          {/* Filter Controls */}
          <div className="filter-controls">
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
              >
                All Blogs ({blogs.length})
              </button>
              <button 
                className={`filter-btn ${filter === "ngo" ? "active" : ""}`}
                onClick={() => setFilter("ngo")}
              >
                NGO Blogs ({blogs.filter(b => b.source === "NGO").length})
              </button>
              <button 
                className={`filter-btn ${filter === "health_worker" ? "active" : ""}`}
                onClick={() => setFilter("health_worker")}
              >
                Health Worker Blogs ({blogs.filter(b => b.source === "Health Worker").length})
              </button>
            </div>
          </div>

          {/* Blogs Display */}
          {filteredBlogs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📰</div>
              <h3>No Blogs Available</h3>
              <p>Check back later for health-related articles and insights.</p>
            </div>
          ) : (
            <div className="blogs-grid">
              {filteredBlogs.map((blog, index) => (
                <div key={index} className="blog-card">
                  <div className="blog-header">
                    <div className="blog-source">
                      <span className="source-icon">{blog.sourceIcon}</span>
                      <span className="source-name">{blog.sourceName}</span>
                      <span className="source-type">{blog.source}</span>
                    </div>
                    <div className="blog-date">
                      {new Date(blog.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="blog-content">
                    <h3 className="blog-title">{blog.title}</h3>
                    <p className="blog-excerpt">
                      {blog.body.length > 150 
                        ? `${blog.body.substring(0, 150)}...` 
                        : blog.body
                      }
                    </p>
                  </div>
                  <div className="blog-footer">
                    <button className="btn btn-outline btn-small">
                      Read More
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
