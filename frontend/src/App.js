import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NewsletterGenerator from "./pages/NewsletterGenerator.js";
import EditorPage from "./pages/Editor.js";
import LoginPage from "./pages/Login.js";
import HomePage from "./pages/Home.js";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element = {<LoginPage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/new" element={<NewsletterGenerator />} />
        {/* <Route path="/audits" element={<AuditsPage />} /> */}
      </Routes>
    </Router>
  );
}

export default App;
