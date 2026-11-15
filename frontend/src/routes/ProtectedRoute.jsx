import { Navigate, Outlet } from "react-router-dom";
import { clearSession, getUser, isTokenExpired } from "../utils/auth";
import AccessDenied from "../components/common/AccessDenied";

// roles (optional): list of roles allowed to open the route
function ProtectedRoute({ roles }) {
  const token = localStorage.getItem("hospital_token");

  if (!token || isTokenExpired(token)) {
    clearSession();
    return <Navigate to="/login" replace />;
  }

  const user = getUser();

  // Guard: if user object has no role, session is corrupt – re-login
  if (!user || !user.role) {
    clearSession();
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    if (user.role === "client") {
      return <Navigate to="/client/dashboard" replace />;
    }
    if (roles.includes("client")) {
      return <Navigate to="/" replace />;
    }
    return <AccessDenied />;
  }

  return <Outlet />;
}

export default ProtectedRoute;