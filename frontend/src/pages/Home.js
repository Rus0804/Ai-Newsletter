import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Sidebar from "./Sidebar.js";
import "./Home.css";

function HomePage() {
  const [drafts, setDrafts] = useState([]);
  const [published, setPublished] = useState([]);
  const [archived, setArchived] = useState([]);

  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [loadingPublished, setLoadingPublished] = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const controllers = {
      Draft: new AbortController(),
      Published: new AbortController(),
      Archive: new AbortController(),
    };

    const token = localStorage.getItem("authToken");

    const fetchNewsletters = async (type, setter, setLoading, signal) => {
      try {
        setLoading(true);
        const response = await fetch("http://127.0.0.1:8000/newsletters", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ type }),
          signal,
        });

        if (!response.ok) throw new Error(`Failed to fetch ${type}`);
        const data = await response.json();
        setter(data);
      } catch (err) {
        if (err.name === "AbortError") {
          console.log(`Aborted fetch for ${type}`);
          return
        } else {
          console.error(err);
          setter([]);
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchNewsletters(
      "Draft",
      setDrafts,
      setLoadingDrafts,
      controllers.Draft.signal
    );
    fetchNewsletters(
      "Published",
      setPublished,
      setLoadingPublished,
      controllers.Published.signal
    );
    fetchNewsletters(
      "Archive",
      setArchived,
      setLoadingArchived,
      controllers.Archive.signal
    );

    return () => {
      Object.values(controllers).forEach((ctrl) => ctrl.abort());
    };
  }, []);

  const renderCards = (data) =>
    data.map((item, index) => (
      <div
        key={index}
        className="card clickable"
        onClick={() => navigate(`/newsletter/${item.file_id}`)}
      >
        <strong>{item.file_name}</strong>
        <div className="card-subtext">Version: {item.version || "N/A"}</div>
        <div className="card-subtext">
          Last edited:{" "}
          {new Date(item.edited_at || item.created_at).toLocaleString()}
        </div>
      </div>
    ));

  return (
    <div className="home-container">
      <Sidebar />
      <div className="main-content">
        <h1 className="home-title">📁 Newsletters Overview</h1>

        <div className="row-section">
          <h2>
            <Link to="/drafts" className="section-link">
              📝 Drafts
            </Link>
          </h2>
          {loadingDrafts ? (
            <div className="loading-message">Loading drafts...</div>
          ) : drafts.length === 0 ? (
            <div className="card">No drafts found</div>
          ) : (
            <div className="card-row">{renderCards(drafts)}</div>
          )}
        </div>

        <div className="row-section">
          <h2>
            <Link to="/published" className="section-link">
              ✅ Published
            </Link>
          </h2>
          {loadingPublished ? (
            <div className="loading-message">Loading published...</div>
          ) : published.length === 0 ? (
            <div className="card">No published newsletters</div>
          ) : (
            <div className="card-row">{renderCards(published)}</div>
          )}
        </div>

        <div className="row-section">
          <h2>
            <Link to="/archived" className="section-link">
              📦 Archived
            </Link>
          </h2>
          {loadingArchived ? (
            <div className="loading-message">Loading archived...</div>
          ) : archived.length === 0 ? (
            <div className="card">No archived newsletters</div>
          ) : (
            <div className="card-row">{renderCards(archived)}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
