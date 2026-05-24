import { Navigate, useLocation } from "react-router-dom";
import { getUser, isLoggedIn } from "../auth/authStore";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const location = useLocation();
  const user = getUser();

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}