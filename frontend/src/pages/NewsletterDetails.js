import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import "./Home.css";

function NewsletterDetailPage() {
  const { file_id } = useParams();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newFileName, setNewFileName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [status, setStatus] = useState(localStorage.getItem("status"));
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://127.0.0.1:8000/newsletter-details", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ file_id }),
          signal,
        });

        if (!response.ok) throw new Error("Failed to fetch newsletter details");

        const data = await response.json();
        setFiles(data);
      } catch (err) {
        if (err.name === "AbortError") {
          console.log("Fetch aborted");
          return;
        }
        console.error("Error fetching newsletter details:", err);
        setFiles([]);
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchDetails();

    return () => {
      controller.abort(); // ✅ Abort fetch on unmount
    };
  }, [file_id]);

  const handleEdit = (file) => {
    localStorage.setItem("projectID", file.file_id);
    localStorage.setItem("filename", file.file_name);
    localStorage.setItem("version", file.version);
    localStorage.setItem("projectData", JSON.stringify(file.project_data));
    navigate("/editor");
  };

  const handleDelete = async (id, ver, ind) => {
    const token = localStorage.getItem("authToken");
    const confirm = window.confirm("Are you sure you want to delete this file?");
    if (!confirm) return;

    try {
      const response = await fetch("http://127.0.0.1:8000/newsletter-delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileID: id,
          version: files.length === 1 ? 0 : ver,
          latest: ind === 0,
        }),
      });

      if (!response.ok) throw new Error("Failed to delete file");

      setFiles((prev) => prev.filter((f) => f.version !== ver));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete file");
    }
  };

  const handleRename = async (file) => {
    const token = localStorage.getItem("authToken");
    try {
      const response = await fetch("http://127.0.0.1:8000/newsletter-rename", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ file_id: file.file_id, file_name: newFileName }),
      });

      if (!response.ok) throw new Error("Failed to rename file");

      setFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.version === 0 ? { ...f, file_name: newFileName } : f
        )
      );
      setIsRenaming(false);
      setNewFileName("");
    } catch (err) {
      console.error("Rename error:", err);
      alert("Failed to rename file");
    }
  };

  const handleStatusChange = async (e, file) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    const token = localStorage.getItem("authToken");

    try {
      const response = await fetch("http://127.0.0.1:8000/newsletter-status-update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ file_id: file.file_id, project_status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");
      localStorage.setItem("status", newStatus)
    } catch (err) {
      console.error("Status update error:", err);
      alert("Failed to update status");
    }
  };

  const renderLatestFileInfo = (file) => (
    <div className="latest-file">
      <h2>🆕 Latest Version</h2>

      <p>
        <strong>File Name:</strong>{" "}
        {isRenaming ? (
          <>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Enter new file name"
              style={{ marginRight: "8px" }}
            />
            <button onClick={() => handleRename(file)}>Save</button>
            <button onClick={() => { setIsRenaming(false); setNewFileName(""); }} style={{ marginLeft: "4px" }}>
              Cancel
            </button>
          </>
        ) : (
          <>
            {file.file_name}{" "}
            <button onClick={() => { setNewFileName(file.file_name); setIsRenaming(true); }} style={{ marginLeft: "10px" }}>
              Rename
            </button>
          </>
        )}
      </p>

      <p><strong>Version:</strong> {file.version}</p>
      <p>
        <strong>Status:</strong>{" "}
        <select 
          value={status} 
          onChange={(e) => handleStatusChange(e, file)}
          style={{
            padding: "5px 10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            marginLeft: "10px",
            backgroundColor: "#f9f9f9",
            fontWeight: "bold"
          }}
        >
          <option value="Draft">Draft</option>
          <option value="Published">Published</option>
          <option value="Archive">Archive</option>
        </select>
      </p>
      <p><strong>Created:</strong> {new Date(file.created_at).toLocaleString()}</p>

      <button
        className="delete-btn"
        onClick={() => handleDelete(file.file_id, 0, 0)}
        style={{ marginTop: "10px" }}
      >
        Delete All
      </button>
      <hr />
    </div>
  );

  const renderFileTable = (data) => (
    <table className="file-table">
      <thead>
        <tr>
          <th>File Name</th>
          <th>Version</th>
          <th>Created At</th>
          <th>Edit</th>
          <th>Delete</th>
        </tr>
      </thead>
      <tbody>
        {data.map((file, index) => (
          <tr key={index}>
            <td>{file.file_name}</td>
            <td>{file.version}</td>
            <td>{new Date(file.created_at).toLocaleString()}</td>
            <td>
              <button className="edit-btn" onClick={() => handleEdit(file)}>Edit</button>
            </td>
            <td>
              <button className="delete-btn" onClick={() => handleDelete(file.file_id, file.version, index)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="home-container">
      <Sidebar />
      <div className="main-content">
        <h1 className="home-title">📄 File History for ID: {file_id}</h1>

        {loading ? (
          <div className="loading-message">Loading details...</div>
        ) : files.length === 0 ? (
          <div className="card">No files found for this ID.</div>
        ) : (
          <>
            {renderLatestFileInfo(files[0])}
            {renderFileTable(files)}
          </>
        )}
      </div>
    </div>
  );
}

export default NewsletterDetailPage;
