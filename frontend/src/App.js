import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NewsletterGenerator from "./pages/NewsletterGenerator.js";
import EditorPage from "./pages/Editor.js";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<NewsletterGenerator />} />
        <Route path="/editor" element={<EditorPage />} />
      </Routes>
    </Router>
  );
}

export default App;
