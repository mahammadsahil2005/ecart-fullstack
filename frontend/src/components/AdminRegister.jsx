import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "./AdminAuth.css";

function AdminRegister() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupStatus, setSetupStatus] = useState(null);

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
        setError(
          "Could not connect to the backend. Start it and refresh this page."
        );
      });
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Bootstrap-Token": setupToken,
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
          }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not create the initial admin account."
        );
      }

      navigate("/admin-login", {
        replace: true,
        state: { message: "Admin account created. Please sign in." },
      });
    } catch (submitError) {
      console.error("Initial admin setup error:", submitError);
      setError(submitError.message || "Admin setup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-auth">
      <section className="admin-auth-card admin-setup-card">
      <span className="admin-auth-kicker">ECART ADMIN</span>
      <h1>Initial setup</h1>
      <p className="admin-auth-description">
        Create the first administrator account to manage your store.
      </p>

      {setupStatus === null ? (
        <p className="admin-auth-notice" role="status">Checking admin setup...</p>
      ) : !setupStatus.initialSetupAvailable ? (
        <p className="admin-auth-notice" role="status">
          Initial setup is already complete.{" "}
          <Link to="/admin-login">Sign in to the existing admin account</Link>.
        </p>
      ) : !setupStatus.bootstrapConfigured ? (
        <p className="admin-auth-error" role="alert">
          The backend has not been configured for initial admin setup. Stop it,
          set <code>ADMIN_BOOTSTRAP_TOKEN</code> in the backend terminal, restart
          it, then refresh this page.
        </p>
      ) : (
        <form className="admin-auth-form" onSubmit={handleSubmit}>
          <div className="admin-auth-field">
            <label htmlFor="admin-setup-token">Setup token</label>
            <input
              id="admin-setup-token"
              type="password"
              value={setupToken}
              onChange={(event) => setSetupToken(event.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className="admin-auth-field">
            <label htmlFor="admin-name">Name</label>
            <input
              id="admin-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
          </div>

          <div className="admin-auth-field">
            <label htmlFor="admin-register-email">Email</label>
            <input
              id="admin-register-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="admin-auth-field">
            <label htmlFor="admin-register-password">Password</label>
            <input
              id="admin-register-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
            <small>Use at least 12 characters.</small>
          </div>

          {error && <p className="admin-auth-error" role="alert">{error}</p>}

          <button className="admin-auth-submit" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create admin account"}
          </button>
        </form>
      )}

      {setupStatus?.initialSetupAvailable && (
        <p className="admin-auth-footer">
          Already have an admin account? <Link to="/admin-login">Sign in</Link>
        </p>
      )}
      </section>
    </main>
  );
}

export default AdminRegister;
