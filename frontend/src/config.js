// Centralized API configuration for CampusConnect
// Automatically sanitizes any trailing slash (e.g. "https://my-backend.onrender.com/" -> "https://my-backend.onrender.com")
const rawApiBase = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
export const API_BASE = rawApiBase.trim().replace(/\/+$/, "");
