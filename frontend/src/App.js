// App.js
import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import NewsletterGenerator from "./pages/NewsletterGenerator.js";
import EditorPage from "./pages/Editor.js";
import LoginPage from "./pages/Login.js";
import HomePage from "./pages/Home.js";

function Layout({ children }) {
  const location = useLocation();

  useEffect(() => {
    const isEditor = location.pathname.startsWith("/editor");

    if (!isEditor) {
      console.log("🧹 Not on editor page — clearing localStorage");
      localStorage.removeItem("projectID");
      localStorage.removeItem("version");
      localStorage.removeItem("filename");
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
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
