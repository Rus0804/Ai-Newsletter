import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    navigate("/login");
  };

  return (
    <div className="sidebar">
      <h2 className="sidebar-title">📰 Dashboard</h2>

      <div className="sidebar-content">
        <nav className="nav-links">
          <NavLink to="/" end className="nav-button">
            🏠 Home
          </NavLink>
          <NavLink to="/new" className="nav-button">
            🆕 New
          </NavLink>
          <NavLink to="/audits" className="nav-button">
            📋 Audits
          </NavLink>
        </nav>

        <button className="nav-button logout-button" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
