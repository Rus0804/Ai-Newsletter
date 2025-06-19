import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import "./Home.css";

function NewsletterListPage({ type, label }) {
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    setLoading(true);
    setNewsletters([]);

    const token = localStorage.getItem("authToken");

    const fetchNewsletters = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/newsletters", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ type }),
          signal,
        });

        if (!response.ok) throw new Error("Failed to fetch newsletters");

        const data = await response.json();
        setNewsletters(data);
      } catch (err) {
        if (err.name === "AbortError") {
          console.log("Fetch aborted");
          return;
        }
        console.error("Error:", err);
        setNewsletters([]);
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchNewsletters();

    return () => {
      controller.abort(); // ✅ Cancel fetch on unmount
    };
  }, [type]);

  const handleCardClick = (file_id) => {
    localStorage.setItem("status", type)
    navigate(`/newsletter/${file_id}`);
  };

  return (
    <div className="home-container">
      <Sidebar />
      <div className="main-content">
        <h1 className="home-title">{label}</h1>
        {loading ? (
          <div className="loading-message">Loading...</div>
        ) : newsletters.length === 0 ? (
          <div className="card">No items found</div>
        ) : (
          <div className="card-row">
            {newsletters.map((item, index) => (
              <div
                key={index}
                className="card clickable"
                onClick={() => handleCardClick(item.file_id)}
              >
                {item.thumbnail_url && (
                  <img
                    src={item.thumbnail_url}
                    alt={`${item.file_name} thumbnail`}
                    className="card-thumbnail"
                  />
                )}
                <strong>{item.file_name}</strong>
                <div className="card-subtext">
                  Version: {item.version || "N/A"}
                </div>
                <div className="card-subtext">
                  Last edited:{" "}
                  {new Date(item.edited_at || item.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NewsletterListPage;
