import React from "react";
import Sidebar from "./Sidebar.js";
import "./Home.css";

function HomePage() {
  return (
    <div className="home-container">
      <Sidebar />
      <div className="main-content">
        <h1 className="home-title">📁 Newsletters Overview</h1>
        <div className="row-section">
          <h2>📝 Drafts</h2>
          {/* Replace with actual draft cards */}
          <div className="card">Draft 1</div>
        </div>
        <div className="row-section">
          <h2>✅ Published</h2>
          <div className="card">Newsletter A</div>
        </div>
        <div className="row-section">
          <h2>📦 Archived</h2>
          <div className="card">Old Issue 2023</div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
