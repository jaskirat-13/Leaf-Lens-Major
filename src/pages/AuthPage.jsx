import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

function parseAuthError(error) {
  const message = String(error?.message || "Authentication failed.").toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (message.includes("already registered") || message.includes("already been registered")) {
    return "This email is already registered.";
  }
  if (message.includes("password") && message.includes("6")) {
    return "Password must be at least 6 characters.";
  }

  return error?.message || "Authentication failed.";
}

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, signUp, requestPasswordReset, updatePassword } = useAuth();

  const initialMode = useMemo(() => {
    const queryMode = new URLSearchParams(location.search).get("mode");
    return queryMode === "reset" ? "reset" : "login";
  }, [location.search]);

  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const redirectPath = useMemo(() => location.state?.from?.pathname || "/app", [location.state]);

  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
        setNotice("Recovery session detected. Set your new password now.");
        setError("");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (user && mode !== "reset") {
    return <Navigate to={redirectPath} replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (mode === "forgot") {
      if (!email) {
        setError("Please enter your email.");
        return;
      }

      try {
        setLoading(true);
        await requestPasswordReset(email);
        setNotice("Password reset link sent. Check your email inbox.");
      } catch (authError) {
        setError(parseAuthError(authError));
      } finally {
        setLoading(false);
      }

      return;
    }

    if (mode === "reset") {
      if (!password || !confirmPassword) {
        setError("Please enter and confirm your new password.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      try {
        setLoading(true);
        await updatePassword(password);
        setNotice("Password updated successfully. You can now login.");
        setMode("login");
        setPassword("");
        setConfirmPassword("");
      } catch (authError) {
        setError(parseAuthError(authError));
      } finally {
        setLoading(false);
      }

      return;
    }

    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    if (mode === "signup") {
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    try {
      setLoading(true);

      if (mode === "login") {
        await signIn({ email, password });
        navigate(redirectPath, { replace: true });
      } else {
        const data = await signUp({ email, password });

        if (!data?.session) {
          setNotice("Signup successful. Please verify your email, then login.");
          setMode("login");
        } else {
          navigate(redirectPath, { replace: true });
        }
      }
    } catch (authError) {
      setError(parseAuthError(authError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page-shell">
      <section className="auth-card">
        <div className="auth-card-head">
          <p className="auth-kicker">LeafLens Access</p>
          <h1>
            {mode === "login" ? "Welcome Back" : mode === "signup" ? "Create Account" : mode === "forgot" ? "Forgot Password" : "Reset Password"}
          </h1>
          <p>
            {mode === "login"
              ? "Login to continue your farming dashboard."
              : mode === "signup"
                ? "Signup to save your analysis history."
                : mode === "forgot"
                  ? "Enter your email to receive a secure reset link."
                  : "Set a new password for your account."}
          </p>
        </div>

        {(mode === "login" || mode === "signup") && (
          <div className="auth-tabs" role="tablist" aria-label="Auth mode switch">
            <button
              type="button"
              role="tab"
              className={`auth-tab ${mode === "login" ? "active" : ""}`}
              aria-selected={mode === "login"}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              className={`auth-tab ${mode === "signup" ? "active" : ""}`}
              aria-selected={mode === "signup"}
              onClick={() => setMode("signup")}
            >
              Signup
            </button>
          </div>
        )}

        <form className="auth-form" onSubmit={submit}>
          {(mode === "login" || mode === "signup" || mode === "forgot") && (
            <>
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </>
          )}

          {(mode === "login" || mode === "signup" || mode === "reset") && (
            <>
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                value={password}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 6 characters"
                required
              />
            </>
          )}

          {(mode === "signup" || mode === "reset") && (
            <>
              <label htmlFor="auth-confirm-password">Confirm Password</label>
              <input
                id="auth-confirm-password"
                type="password"
                value={confirmPassword}
                autoComplete="new-password"
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter password"
                required
              />
            </>
          )}

          {error ? <p className="auth-message auth-error">{error}</p> : null}
          {notice ? <p className="auth-message auth-notice">{notice}</p> : null}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Login"
                : mode === "signup"
                  ? "Create Account"
                  : mode === "forgot"
                    ? "Send Reset Link"
                    : "Update Password"}
          </button>

          {mode === "login" && (
            <button
              type="button"
              className="auth-link-button"
              onClick={() => {
                setMode("forgot");
                setError("");
                setNotice("");
              }}
            >
              Forgot password?
            </button>
          )}

          {(mode === "forgot" || mode === "reset") && (
            <button
              type="button"
              className="auth-link-button"
              onClick={() => {
                setMode("login");
                setError("");
                setNotice("");
              }}
            >
              Back to login
            </button>
          )}
        </form>
      </section>
    </main>
  );
}
