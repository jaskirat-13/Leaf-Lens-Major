import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function getHistoryKey(userId) {
  return `leaflens_prediction_history_${userId}`;
}

export default function PredictionHistoryPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const history = useMemo(() => {
    if (!user?.id) return [];

    try {
      const raw = localStorage.getItem(getHistoryKey(user.id));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/auth", { replace: true });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Logout failed.");
    }
  };

  return (
    <main className="auth-page-shell" style={{ minHeight: "100vh", paddingTop: "120px" }}>
      <section className="auth-card" style={{ maxWidth: "900px" }}>
        <div className="auth-card-head">
          <p className="auth-kicker">Protected Area</p>
          <h1>Prediction History</h1>
          <p>Signed in as {user?.email || "unknown user"}</p>
        </div>

        <div className="history-actions">
          <button className="auth-submit" type="button" onClick={() => navigate("/app")}>Back to Dashboard</button>
          <button className="auth-secondary" type="button" onClick={handleLogout}>Logout</button>
        </div>

        {history.length === 0 ? (
          <div className="history-empty">No predictions saved yet. Run a disease analysis to populate history.</div>
        ) : (
          <div className="history-grid">
            {history.map((item) => (
              <article className="history-card" key={item.id}>
                <p className="history-title">{item.disease}</p>
                <p className="history-meta">Crop: {item.crop}</p>
                <p className="history-meta">Confidence: {item.confidence}%</p>
                <p className="history-meta">{new Date(item.createdAt).toLocaleString()}</p>
                {item.needsReview ? <p className="history-warning">Needs verification</p> : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
