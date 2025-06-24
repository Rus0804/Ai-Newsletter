import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import LoginPage from "./pages/Login";
import HomePage from "./pages/Home";
import EditorPage from "./pages/Editor";
import NewsletterGenerator from "./pages/NewsletterGenerator";
import NewsletterListPage from "./pages/NewsletterList";
import NewsletterDetailPage from "./pages/NewsletterDetails";

function Layout({ children }) {
  const location = useLocation();

  React.useEffect(() => {
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
          {/* Default route to login */}
          <Route path="/" element={<Navigate to="/login" />} />

          <Route
            path="/login"
            element={<LoginPage />}
          />

          {/* All other routes protected */}
          <Route
            path="/home"
            element={<HomePage />}
          />
          <Route
            path="/editor"
            element={<EditorPage />}
          />
          <Route
            path="/new"
            element={<NewsletterGenerator />}
          />
          <Route
            path="/drafts"
            element={<NewsletterListPage type="Draft" label="📝 Drafts" />}
          />
          <Route
            path="/published"
            element={<NewsletterListPage type="Published" label="✅ Published" />}
          />
          <Route
            path="/archived"
            element={<NewsletterListPage type="Archive" label="📦 Archived" />}
          />
          <Route
            path="/newsletter/:file_id"
            element={<NewsletterDetailPage />}
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
