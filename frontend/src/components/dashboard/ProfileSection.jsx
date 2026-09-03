import React, { useState, useEffect } from "react";
import api from "../../utils/api.js";

export default function ProfileSection({ user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [blogs, setBlogs] = useState([]);
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [blogForm, setBlogForm] = useState({ title: "", body: "" });

  useEffect(() => {
    fetchProfile();
    if (user?.role === "ngo" || user?.role === "health_worker") {
      fetchBlogs();
    }
  }, [user?.role]);

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
      const endpoint = user?.role === "ngo" ? "/ngo/blogs" : "/healthworker/blogs";
      const response = await api.get(endpoint);
      setBlogs(response.data.data || []);
    } catch (err) {
      console.error("Error fetching blogs:", err);
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
      const endpoint = user?.role === "ngo" ? "/ngo/blogs" : "/healthworker/blogs";
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBlogChange = (e) => {
    const { name, value } = e.target;
    setBlogForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getProfileFields = () => {
    switch (user?.role) {
      case "doctor":
        return [
          { name: "name", label: "Full Name", type: "text", required: true },
          { name: "specialization", label: "Specialization", type: "text", required: true },
          { name: "licenseNumber", label: "License Number", type: "text", required: true },
          { name: "affiliation", label: "Affiliation/Hospital", type: "text", required: true },
          { name: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"], required: true },
          { name: "fee", label: "Consultation Fee", type: "number", required: true }
        ];
      case "health_worker":
        return [
          { name: "name", label: "Full Name", type: "text", required: true },
          { name: "employer", label: "Employer", type: "text", required: true },
          { name: "certId", label: "Certification ID", type: "text", required: true },
          { name: "region", label: "Region", type: "text", required: true }
        ];
      case "ngo":
        return [
          { name: "orgName", label: "Organization Name", type: "text", required: true },
          { name: "registrationNumber", label: "Registration Number", type: "text", required: true },
          { name: "mission", label: "Mission", type: "textarea", required: true },
          { name: "website", label: "Website", type: "url", required: false },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "services", label: "Services (comma separated)", type: "text", required: true }
        ];
      case "patient":
        return [
          { name: "name", label: "Full Name", type: "text", required: true }
        ];
      default:
        return [];
    }
  };

  if (loading && !profile) {
    return (
      <div>
        <div className="section-header">
          <h1 className="section-title">Profile</h1>
          <p className="section-subtitle">Manage your profile information</p>
        </div>
        <div className="section-content">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Profile</h1>
        <p className="section-subtitle">Complete your profile based on your role</p>
      </div>

      <div className="section-content">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div className="card-icon">👤</div>
              <h3 className="card-title">General Information</h3>
            </div>
            <div className="card-content">
              <div className="profile-info">
                <div className="info-item">
                  <strong>Name:</strong>
                  <span>{user?.firstName} {user?.lastName}</span>
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
                          {field.required && <span className="required">*</span>}
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
                    <p>No profile information available. Click "Edit Profile" to add your details.</p>
                  )}
                </div>
              )}
            </div>
          </div>
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
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                    >
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
                    <p>No blogs published yet. Click "Add Blog" to create your first blog post.</p>
                  ) : (
                    <div className="blogs-list">
                      <h4>Your Published Blogs ({blogs.length})</h4>
                      {blogs.map((blog, index) => (
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
