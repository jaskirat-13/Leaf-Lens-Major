import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "../App";
import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import AuthPage from "../pages/AuthPage";
import PredictionHistoryPage from "../pages/PredictionHistoryPage";

function AppRouteWrapper() {
  const { user, session, signOut } = useAuth();

  return (
    <App
      userId={user?.id || ""}
      userEmail={user?.email || ""}
      authToken={session?.access_token || ""}
      onLogout={signOut}
    />
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppRouteWrapper />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/app" element={<Navigate to="/" replace />} />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <PredictionHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
