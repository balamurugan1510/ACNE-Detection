import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, role: requiredRole }) {
  const { token, role } = useAuth();
  const location = useLocation();

  if (!token) {
    const to =
      requiredRole === "patient" ? "/patient/login" : "/doctor/login";
    return <Navigate to={to} state={{ from: location }} replace />;
  }

  if (requiredRole && role !== requiredRole) {
    if (role === "patient") {
      return <Navigate to="/patient/home" replace />;
    }
    if (role === "doctor") {
      return <Navigate to="/doctor/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
}
