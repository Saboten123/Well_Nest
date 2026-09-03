// src/utils/api.js
import axios from "axios";

// Main API for authentication, user data, profiles, etc.
const api = axios.create({
  baseURL: "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Blockchain API for payments, donations, token rewards, etc.
const blockchainApi = axios.create({
  baseURL: "http://localhost:7000",
  headers: {
    "Content-Type": "application/json",
  },
});

// AI Assistant API (FastAPI)
// Uses withCredentials to allow guest cookie-based sessions when not signed in
// Route through Vite proxy to avoid CORS in dev: "/ai" → target backend
const aiApi = axios.create({
  baseURL: "/ai",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Add auth token to main API requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add auth token to blockchain API requests
blockchainApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add auth token to AI API requests (enables Mongo-backed memory when signed in)
aiApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // Ensure Authorization header is absent for guest sessions
    if (config.headers && "Authorization" in config.headers) {
      delete config.headers.Authorization;
    }
  }
  return config;
});

// Add response interceptor for main API
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/signin";
    }
    return Promise.reject(error);
  }
);

// Add response interceptor for blockchain API
blockchainApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/signin";
    }
    return Promise.reject(error);
  }
);

export default api;
export { blockchainApi, aiApi };
