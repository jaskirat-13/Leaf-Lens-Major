import React from "react";
import ReactDOM from "react-dom/client";
import AppRouter from "./router/AppRouter";
import { TranslationProvider } from "./TranslationContext";
import { AuthProvider } from "./context/AuthContext";
import "../styles.css";

const rootElement = document.getElementById("root");

function showBootError(message) {
  if (!rootElement) {
    return;
  }

  rootElement.innerHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 760px; margin: 40px auto; padding: 16px; border: 1px solid #e2e2e2; border-radius: 10px; background: #fff; color: #1f2937; line-height: 1.5;">
      <h2 style="margin: 0 0 8px;">Leaflens failed to start</h2>
      <p style="margin: 0 0 8px;">${message}</p>
      <p style="margin: 0;">Run <code>npm run dev</code> and open the URL shown in the terminal (for example <code>http://127.0.0.1:5173/</code>).</p>
    </div>
  `;
}

window.addEventListener("error", (event) => {
  showBootError(event.message || "Unexpected runtime error.");
});

window.addEventListener("unhandledrejection", (event) => {
  const message = event.reason instanceof Error ? event.reason.message : "Unhandled promise rejection.";
  showBootError(message);
});

try {
  if (!rootElement) {
    throw new Error("Root mount element #root not found.");
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <TranslationProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </TranslationProvider>
    </React.StrictMode>
  );
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown startup error.";
  showBootError(message);
}
