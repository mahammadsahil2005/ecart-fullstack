import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ user, children }) {
  const location = useLocation();
  const token = localStorage.getItem("token");

  // Check whether the user and token exist
  if (!user || !token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
}

export default ProtectedRoute;