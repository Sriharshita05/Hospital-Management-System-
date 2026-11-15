import axios from "axios";
import { clearSession } from "../utils/auth";

// Set VITE_API_URL in frontend/.env for deployment (see .env.example)
const api = axios.create({
  baseURL: "https://hospital-management-system-x0qn.onrender.com/api",
  headers: {
    "Content-Type": "application/json"
  }
});

// Automatically attach the login token to API requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("hospital_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// If the token is expired or the account was deactivated, go back to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes("/auth/login");

    if (error.response?.status === 401 && !isLoginRequest) {
      clearSession();
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
