/**
 * Centralized Growvia API Configuration
 * Production default points to the Render Express Backend Web Service.
 * Local development resolves import.meta.env.VITE_API_URL or http://localhost:5000.
 */
const env = (typeof import.meta !== 'undefined' && (import.meta as any)?.env) || process?.env || {};
const isLocal = typeof window !== 'undefined'
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  : true;

export const API_URL = (
  env.VITE_API_URL ||
  env.VITE_API_BASE_URL ||
  env.API_URL ||
  (isLocal ? "http://localhost:5001" : "https://growvia-backend-4wp7.onrender.com")
).replace(/\/$/, "");
