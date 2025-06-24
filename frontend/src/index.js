import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

// Step 1: Create query client
const queryClient = new QueryClient();

// Step 2: Create sessionStorage persister
const persister = createSyncStoragePersister({
  storage: window.sessionStorage,
});

// Step 3: Enable persistence
persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 20, // 10 minutes
});

// Step 4: Render App
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
