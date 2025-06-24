import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    const endpoint = isSignup ? 'signup' : 'login';

    try {
      const response = await fetch(`http://127.0.0.1:8000/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if(response.ok){
        if (isSignup) {
          if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
          }
          setError("");
          alert("Signup successful. Please login.");
          setIsSignup(false);
          setEmail("");
          setPassword("");
          setConfirmPassword("");
        } else {
          localStorage.setItem('authToken', data.access_token);
          navigate('/home')
        }
      } else{
        var err = data.message;
        if (err === 'duplicate key value violates unique constraint'){
          err = 'Email already has an account'
        }
        setError(err || 'Something went wrong');
      }
    } catch (err) {
      setError('Network error. Please try again later.');
    }    
  };

  return (
    <div className="login-container">
      <h2 className="login-title">
        {isSignup ? "📝 Sign Up for AI Newsletter Generator" : "🔐 Login to AI Newsletter Generator"}
      </h2>

      <form onSubmit={handleSubmit} className="login-form">
        <label className="login-label">Email</label>
        <input
          type="email"
          className="login-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
        />

        <label className="login-label">Password</label>
        <input
          type="password"
          className="login-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
        />

        {isSignup && (
          <>
            <label className="login-label">Confirm Password</label>
            <input
              type="password"
              className="login-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
            />
          </>
        )}

        {error && <div className="login-error">{error}</div>}

        <button type="submit" className="login-button">
          {isSignup ? "📝 Sign Up" : "🔓 Login"}
        </button>

        <div className="login-toggle">
          {isSignup ? (
            <p>
              Already have an account?{" "}
              <span onClick={() => setIsSignup(false)} className="login-link">
                Log in
              </span>
            </p>
          ) : (
            <p>
              Don't have an account?{" "}
              <span onClick={() => setIsSignup(true)} className="login-link">
                Sign up
              </span>
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

export default LoginPage;
