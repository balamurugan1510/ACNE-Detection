import axios from "axios";

/**
 * API origin for browser requests.
 * - With Nginx on :80, same-origin + /api works (VITE_API_URL empty).
 * - Direct :3000 (frontend container or Vite) has no /api proxy → use :8000 backend.
 */
export function getApiOrigin() {
  const v = import.meta.env.VITE_API_URL;
  if (v !== undefined && v !== null && String(v).trim() !== "") {
    return String(v).replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    if (port === "3000" || port === "5173") {
      return `${protocol}//${hostname}:8000`;
    }
    return window.location.origin;
  }
  return "http://localhost:8000";
}

export const api = axios.create({
  baseURL: `${getApiOrigin()}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function parseJwt(token) {
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}
