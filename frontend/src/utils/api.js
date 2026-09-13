// src/utils/api.js
import axios from "axios";

// Main API for authentication, user data, profiles, etc.
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });
const blockchainApi = axios.create({ baseURL: import.meta.env.VITE_BLOCKCHAIN_API_URL });
const aiApi = axios.create({ baseURL: import.meta.env.VITE_AI_API_URL, withCredentials: true });

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