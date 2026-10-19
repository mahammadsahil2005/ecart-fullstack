
import { Navigate } from "react-router-dom";

function AdminProtectedRoute({ children }) {
  let admin = null;
  const token = localStorage.getItem("adminToken");

  try {
    const savedAdmin = localStorage.getItem("admin");

    if (savedAdmin) {
      admin = JSON.parse(savedAdmin);
    }
  } catch (error) {
    console.error("Invalid admin data:", error);
  }

  // Check admin information and token
  const isAdminSessionPresent =
    admin &&
    admin.id != null &&
    typeof token === "string" &&
    token.trim().length > 0;

  if (!isAdminSessionPresent) {
    localStorage.removeItem("admin");
    localStorage.removeItem("adminToken");

    return (
      <Navigate
        to="/admin-login"
        replace
      />
    );
  }

  return children;
}

export default AdminProtectedRoute;
