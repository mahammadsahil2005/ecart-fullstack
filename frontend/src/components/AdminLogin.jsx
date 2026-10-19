import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "./AdminAuth.css";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [setupStatus, setSetupStatus] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/setup-status`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not check admin account setup.");
        }

        return response.json();
      })
      .then(setSetupStatus)
      .catch((statusError) => {
        console.error("Admin setup status error:", statusError);
      });
  }, []);

  async function handleLogin(e) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );
      const responseText = await response.text();
      let data = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = {};
        }
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            (response.status === 401
              ? "Invalid admin email or password."
              : `Admin login failed (HTTP ${response.status}). Check the backend configuration and logs.`)
        );
      }

      // The backend must return a JWT token.
      if (!data.token) {
        throw new Error(
          "The admin login response does not contain a JWT token. Check the backend admin login API."
        );
      }

      // Save admin information and token separately.
      localStorage.setItem(
        "admin",
        JSON.stringify(data)
      );

      localStorage.setItem(
        "adminToken",
        data.token
      );

      alert("Admin login successful!");

      navigate("/admin");
    } catch (error) {
      console.error("Admin login error:", error);
      setError(error.message || "Admin login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-auth">
      <section className="admin-auth-card">
        <span className="admin-auth-kicker">ECART ADMIN</span>
        <h1>Welcome back.</h1>
        <p className="admin-auth-description">Sign in to manage your store.</p>

      {location.state?.message && (
        <p className="admin-auth-notice" role="status">{location.state.message}</p>
      )}

      {setupStatus?.initialSetupAvailable && (
        <p className="admin-auth-notice" role="status">
          No admin account exists yet.{" "}
          {setupStatus.bootstrapConfigured
            ? "Create the initial account to continue."
            : "The backend needs ADMIN_BOOTSTRAP_TOKEN configured before initial setup."}
        </p>
      )}

      <form className="admin-auth-form" onSubmit={handleLogin}>
        <div className="admin-auth-field">
          <label htmlFor="admin-email">
            Email
          </label>

          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter admin email"
            autoComplete="username"
            required
          />
        </div>

        <div className="admin-auth-field">
          <label htmlFor="admin-password">
            Password
          </label>

          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
            autoComplete="current-password"
            required
          />
        </div>

        {error && (
          <p className="admin-auth-error" role="alert">
            {error}
          </p>
        )}

        <button className="admin-auth-submit"
          type="submit"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {setupStatus?.initialSetupAvailable && setupStatus.bootstrapConfigured && (
        <p className="admin-auth-footer">
          Setting up the first admin?{" "}
          <Link to="/admin-register">Create the initial admin account</Link>
        </p>
      )}
      </section>
    </main>
  );
}

export default AdminLogin;