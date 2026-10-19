
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "./Login.css";

function Login({ setUser }) {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event) {
    event.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/users/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password: password,
          }),
        }
      );

      // Read the response as text first.
      // This avoids a JSON parsing error for an empty response.
      const responseText = await response.text();

      console.log("Login status:", response.status);
      console.log("Login response:", responseText);

      if (!responseText.trim()) {
        throw new Error(
          `The server returned an empty response (HTTP ${response.status}).`
        );
      }

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          "The server returned an invalid response. Check the backend."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          `Login failed (HTTP ${response.status}).`
        );
      }

      // Confirm that the backend returned a usable login response.
      if (!data.token) {
        throw new Error(
          "Login response does not contain a token. Check your backend login controller."
        );
      }

      // Save the token and user information.
      localStorage.setItem("token", data.token);

      const user = {
        id: data.id,
        name: data.name,
        email: data.email || email.trim(),
      };

      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);

      // Navigate only after successful login.
      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.message ||
        "Unable to log in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
      <span className="login-eyebrow">WELCOME BACK</span>
      <h1>Good to see you.</h1>
      <p className="login-subtitle">
        Log in to continue to your E-Cart account.
      </p>

      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label htmlFor="email">Email address</label>

        <input
            id="email"
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="Enter your email"
            autoComplete="email"
            required
          />
          </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
        </div>

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        <button className="login-btn" type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

        <p className="register-link">
          Don&apos;t have an account?{" "}
          <Link to="/register">Register</Link>
        </p>
      </section>
    </main>
  );
}

export default Login;
