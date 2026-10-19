import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "./Register.css";

function Register() {

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    fetch(`${API_BASE_URL}/api/users/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: name,
        email: email,
        password: password
      })
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Registration failed");
        }

        return response.json();
      })
      .then((data) => {
        console.log("Registered user:", data);

        alert("Registration successful!");

        navigate("/login");
      })
      .catch((error) => {
        console.error("Registration error:", error);
        alert("Registration failed!");
      });
  }

  return (
    <main className="register-page">

      <div className="register-card">

        <h1>Create Account</h1>

        <p className="register-subtitle">
          Create your E-Cart account
        </p>

        <form onSubmit={handleSubmit}>

          <div className="form-group">

            <label>Name</label>

            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
            />

          </div>

          <div className="form-group">

            <label>Email</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />

          </div>

          <div className="form-group">

            <label>Password</label>

            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />

          </div>

          <div className="form-group">

            <label>Confirm Password</label>

            <input
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              required
            />

          </div>

          <button
            type="submit"
            className="register-btn"
          >
            Register
          </button>

        </form>

        <p className="login-link">

          Already have an account?{" "}

          <Link to="/login">
            Login
          </Link>

        </p>

      </div>

    </main>
  );
}

export default Register;
