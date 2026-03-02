/**
 * Main App Component with Routing
 * Handles authentication boundaries and route protection
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Component, type ReactNode } from "react";
import { AuthProvider } from "@/core/auth";
import { ProtectedRoute } from "@/core/auth";
import { LoginPage } from "@/features/auth";
import AppContainer from "./AppContainer";

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("[App] Fatal error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            padding: "2rem",
            backgroundColor: "#f5f5f5",
          }}
        >
          <h1 style={{ color: "#d32f2f", marginBottom: "1rem" }}>
            Configuration Error
          </h1>
          <p
            style={{
              marginBottom: "1rem",
              maxWidth: "600px",
              textAlign: "center",
            }}
          >
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <details style={{ maxWidth: "800px", width: "100%" }}>
            <summary style={{ cursor: "pointer", marginBottom: "1rem" }}>
              Show Details
            </summary>
            <pre
              style={{
                backgroundColor: "#fff",
                padding: "1rem",
                borderRadius: "4px",
                overflow: "auto",
                fontSize: "0.875rem",
              }}
            >
              {this.state.error?.stack || "No stack trace available"}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public route: Login */}
            <Route path="/" element={<LoginPage />} />

            {/* Protected route: Main app */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppContainer />
                </ProtectedRoute>
              }
            />

            {/* Fallback: redirect to root */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;
