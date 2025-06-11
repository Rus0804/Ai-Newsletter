import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }

    // Dummy authentication logic
    if (username === "admin" && password === "password") {
      setError("");
      navigate("/"); // Notify parent to navigate to the main app
    } else {
      setError("Invalid credentials.");
    }
  };

  return (
    <div className="login-container">
      <h2 className="login-title">🔐 Login to AI Newsletter Generator</h2>
      <form onSubmit={handleSubmit} className="login-form">
        <label className="login-label">Username</label>
        <input
          type="text"
          className="login-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
        />

        <label className="login-label">Password</label>
        <input
          type="password"
          className="login-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
        />

        {error && <div className="login-error">{error}</div>}

        <button type="submit" className="login-button">
          🔓 Login
        </button>
      </form>
    </div>
  );
}

export default LoginPage;
