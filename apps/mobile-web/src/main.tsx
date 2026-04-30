import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "@/app/router";
import { AuthProvider } from "@/shared/auth/auth-context";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <div className="device-frame">
          <AppRouter />
        </div>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
