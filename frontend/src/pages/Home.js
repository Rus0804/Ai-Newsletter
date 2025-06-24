import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Sidebar from "./Sidebar.js";
import "./Home.css";
import { useQuery, useQueryClient } from '@tanstack/react-query';

const fetchNewsletters = async (type) => {
  const token = localStorage.getItem("authToken");
  const response = await fetch("http://127.0.0.1:8000/newsletters", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ type }),
  });
  if (!response.ok) throw new Error(`Failed to fetch ${type}`);
  return response.json();
};

function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: drafts = [],
    isLoading: loadingDrafts,
    isFetching: fetchingDrafts,
  } = useQuery({
    queryKey: ['newsletters', 'Draft'],
    queryFn: () => fetchNewsletters('Draft'),
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  const {
    data: published = [],
    isLoading: loadingPublished,
    isFetching: fetchingPublished,
  } = useQuery({
    queryKey: ['newsletters', 'Published'],
    queryFn: () => fetchNewsletters('Published'),
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  const {
    data: archived = [],
    isLoading: loadingArchived,
    isFetching: fetchingArchived,
  } = useQuery({
    queryKey: ['newsletters', 'Archive'],
    queryFn: () => fetchNewsletters('Archive'),
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  useEffect(() => {
    console.log(localStorage.getItem("shouldRefetch"))
    const refetchArray = JSON.parse(localStorage.getItem("shouldRefetch"))
    console.log(refetchArray)
    if (refetchArray) {
      if(refetchArray[0]){queryClient.invalidateQueries({ queryKey: ["newsletters", "Draft"] });}
      if(refetchArray[1]){queryClient.invalidateQueries({ queryKey: ["newsletters", "Published"] });}
      if(refetchArray[2]){queryClient.invalidateQueries({ queryKey: ["newsletters", "Archive"] });}
      localStorage.removeItem("shouldRefetch");
    }
  }, [queryClient]);

  const renderCards = (data) =>
    data.map((item, index) => (
      <div
        key={index}
        className="card clickable"
        onClick={() => {
          localStorage.setItem("status", item.project_status);
          navigate(`/newsletter/${item.file_id}`);
        }}
      >
        {item.thumbnail_url && (
          <img
            src={item.thumbnail_url}
            alt={`${item.file_name} thumbnail`}
            className="card-thumbnail"
          />
        )}
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
            <Link to="/drafts" className="section-link">📝 Drafts</Link>
          </h2>
          {loadingDrafts ? (
            <div className="loading-message">Loading drafts...</div>
          ) : fetchingDrafts ? (
            <div className="loading-message">Refreshing drafts...</div>
          ) : drafts.length === 0 ? (
            <div className="card">No drafts found</div>
          ) : (
            <div className="card-row">{renderCards(drafts)}</div>
          )}
        </div>

        <div className="row-section">
          <h2>
            <Link to="/published" className="section-link">✅ Published</Link>
          </h2>
          {loadingPublished ? (
            <div className="loading-message">Loading published...</div>
          ) : fetchingPublished ? (
            <div className="loading-message">Refreshing published...</div>
          ) : published.length === 0 ? (
            <div className="card">No published newsletters</div>
          ) : (
            <div className="card-row">{renderCards(published)}</div>
          )}
        </div>

        <div className="row-section">
          <h2>
            <Link to="/archived" className="section-link">📦 Archived</Link>
          </h2>
          {loadingArchived ? (
            <div className="loading-message">Loading archived...</div>
          ) : fetchingArchived ? (
            <div className="loading-message">Refreshing archived...</div>
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
