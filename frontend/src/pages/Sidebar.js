import React from "react";
import { NavLink } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {
  return (
    <div className="sidebar">
      <h2 className="sidebar-title">📰 Dashboard</h2>
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
    </div>
  );
}

export default Sidebar;
