import React, { useState } from "react";
import "./NewsletterGenerator.css";

function NewsletterGenerator() {
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [tone, setTone] = useState("");
  const [pdfTemplate, setPdfTemplate] = useState(null);
  const [htmlFilePath, setHtmlFilePath] = useState(null);
  const [progress, setProgress] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setPdfTemplate(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProgress("Starting...");
    setHtmlFilePath(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("topic", topic);
    if (content.trim()) formData.append("content", content);
    if (tone.trim()) formData.append("tone", tone);
    if (pdfTemplate) formData.append("pdfTemplate", pdfTemplate);

    try {
      const response = await fetch("http://127.0.0.1:8000/generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to connect to the backend.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let resultText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        resultText += chunk;

        const messages = resultText.split("\n\n").filter(Boolean);
        for (let msg of messages) {
          if (msg.startsWith("data: ")) {
            const data = msg.replace("data: ", "").trim();
            setProgress(data);

            if (data.startsWith("Done|")) {
              const parts = data.split("|");
              const filename = parts[1];
              if (filename && !filename.startsWith("Error")) {
                setHtmlFilePath(`http://127.0.0.1:8000/html/${filename}`);
              }
              setLoading(false);
              return;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error.message);
      setProgress("❌ Error occurred during generation.");
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
  if (!htmlFilePath) return;

  const filename = htmlFilePath.split("/").pop(); // extract filename from URL

  try {
    const response = await fetch("http://127.0.0.1:8000/export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("Failed to export PDF.");
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename.replace(".html", ".pdf");
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
      } catch (error) {
        console.error("Export failed:", error);
        alert("❌ Failed to export PDF.");
      }
    };


  return (
    <div className="app-container">
      <h1 className="app-title">📰 AI Newsletter Generator</h1>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">
            🧠 Topic <span className="required">*</span>
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
            className="input"
            placeholder="e.g., AI Trends, Sustainability..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">✏️ Content to Guide (optional)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            className="textarea"
            placeholder="Provide any details you want the AI to include..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">🎯 Tone (optional)</label>
          <input
            type="text"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder="e.g., friendly, professional..."
            className="input"
          />
        </div>

        <div className="form-group">
          <label className="form-label">📄 PDF Template (optional)</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="file-input"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`submit-button ${loading ? "disabled" : ""}`}
        >
          {loading ? "⏳ Generating..." : "🚀 Generate Newsletter"}
        </button>
      </form>

      {progress && (
        <div
          className={`status-box ${
            progress.includes("Error") ? "error" : "success"
          }`}
        >
          <strong>Status:</strong> {progress.startsWith('Done')? (progress.includes("Error")? progress.split('|')[1]: 'Done'): progress}
        </div>
      )}

      {htmlFilePath && (
        <div className="view-button-container">
          <button
            onClick={() => window.open(htmlFilePath, "_blank")}
            className="view-button"
          >
            🌐 View Newsletter
          </button>
          <button
            onClick={handleExportPdf}
            className="download-button"
          >
            📥 Export as PDF
          </button>
          <div style={{ marginTop: "2rem" }}>
            <button
            onClick={() => window.location.href = "/editor"}
            className="navigate-button"
            >
            🛠️ Go to Editor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NewsletterGenerator;
