import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api.js";
import Navbar from "../components/Navbar.jsx";
import "../styles/AdminDashboard.css";

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        // Client-side gate for UX only — the real enforcement is the backend's
        // requireAdmin middleware. A non-admin poking this route directly still
        // gets a 403 from every request below.
        const role = localStorage.getItem("userRole");
        if (role !== "admin") {
            navigate("/");
            return;
        }
        fetchData();
    }, [navigate]);

    const fetchData = async () => {
        setLoading(true);
        setError("");
        try {
            const [usersRes, statsRes] = await Promise.all([
                api.get("/admin/users"),
                api.get("/admin/stats"),
            ]);
            setUsers(usersRes.data.data);
            setStats(statsRes.data.data);
        } catch (err) {
            setError(
                err.response?.data?.message || "Failed to load admin data"
            );
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (userId, name) => {
        if (!window.confirm(`Delete ${name}'s account? This cannot be undone.`)) {
            return;
        }
        try {
            await api.delete(`/admin/users/${userId}`);
            setUsers((prev) => prev.filter((u) => u.id !== userId));
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete user");
        }
    };

    const filteredUsers = users.filter((u) => {
        const matchesRole = roleFilter === "all" || u.role === roleFilter;
        const q = search.trim().toLowerCase();
        const matchesSearch =
            !q ||
            u.email?.toLowerCase().includes(q) ||
            `${u.firstName} ${u.lastName}`.toLowerCase().includes(q);
        return matchesRole && matchesSearch;
    });

    return (
        <div className="admin-page">
            <Navbar />
            <div className="admin-container">
                <h1 className="admin-title">Admin Panel</h1>
                <p className="admin-subtitle">All registered users and their profile data</p>

                {error && <div className="admin-error">{error}</div>}

                {stats && (
                    <div className="admin-stats-grid">
                        <StatCard label="Total Users" value={stats.totalUsers} />
                        <StatCard label="Doctors" value={stats.doctors} />
                        <StatCard label="Patients" value={stats.patients} />
                        <StatCard label="Health Workers" value={stats.healthWorkers} />
                        <StatCard label="NGOs" value={stats.ngos} />
                        <StatCard label="Appointments" value={stats.appointments} />
                    </div>
                )}

                <div className="admin-toolbar">
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="admin-search"
                    />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="admin-role-select"
                    >
                        <option value="all">All roles</option>
                        <option value="doctor">Doctors</option>
                        <option value="patient">Patients</option>
                        <option value="health_worker">Health Workers</option>
                        <option value="ngo">NGOs</option>
                        <option value="admin">Admins</option>
                    </select>
                </div>

                {loading ? (
                    <div className="admin-loading">Loading users...</div>
                ) : (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Phone</th>
                                    <th>Profile</th>
                                    <th>Joined</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((u) => (
                                    <React.Fragment key={u.id}>
                                        <tr
                                            className="admin-row"
                                            onClick={() =>
                                                setExpandedId(expandedId === u.id ? null : u.id)
                                            }
                                        >
                                            <td>{u.firstName} {u.lastName}</td>
                                            <td>{u.email}</td>
                                            <td>
                                                <span className={`admin-role-badge role-${u.role}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td>{u.phone || "—"}</td>
                                            <td>
                                                {u.isProfileComplete === null
                                                    ? "—"
                                                    : u.isProfileComplete
                                                        ? "Complete"
                                                        : "Incomplete"}
                                            </td>
                                            <td>
                                                {u.createdAt
                                                    ? new Date(u.createdAt).toLocaleDateString()
                                                    : "—"}
                                            </td>
                                            <td>
                                                <button
                                                    className="admin-delete-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(u.id, `${u.firstName} ${u.lastName}`);
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedId === u.id && (
                                            <tr className="admin-expanded-row">
                                                <td colSpan={7}>
                                                    <pre className="admin-profile-json">
                                                        {JSON.stringify(u.profile || {}, null, 2)}
                                                    </pre>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="admin-empty">
                                            No users match your filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value }) {
    return (
        <div className="admin-stat-card">
            <div className="admin-stat-value">{value ?? "—"}</div>
            <div className="admin-stat-label">{label}</div>
        </div>
    );
}
