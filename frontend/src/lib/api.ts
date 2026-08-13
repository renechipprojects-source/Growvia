/**
 * Centralized Growvia API Configuration
 * Production default points to the Render Express Backend Web Service.
 * Local development resolves import.meta.env.VITE_API_URL or http://localhost:5000.
 */
export const API_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://growvia-backend-4wp7.onrender.com"
).replace(/\/$/, "");
