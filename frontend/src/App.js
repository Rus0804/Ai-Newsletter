// App.js
import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import NewsletterGenerator from "./pages/NewsletterGenerator.js";
import EditorPage from "./pages/Editor.js";
import LoginPage from "./pages/Login.js";
import HomePage from "./pages/Home.js";
import NewsletterListPage from "./pages/NewsletterList.js";
import NewsletterDetailPage from "./pages/NewsletterDetails.js";

function Layout({ children }) {
  const location = useLocation();

  useEffect(() => {
    const isEditor = location.pathname.startsWith("/editor");

    if (!isEditor) {
      localStorage.removeItem("projectID");
      localStorage.removeItem("version");
      localStorage.removeItem("filename");
      localStorage.removeItem("projectData");
    }
  }, [location.pathname]);

  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/new" element={<NewsletterGenerator />} />
          <Route path="/drafts" element={<NewsletterListPage type="Draft" label="📝 Drafts" />} />
          <Route path="/published" element={<NewsletterListPage type="Published" label="✅ Published" />} />
          <Route path="/archived" element={<NewsletterListPage type="Archive" label="📦 Archived" />} />
          <Route path="/newsletter/:file_id" element={<NewsletterDetailPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
