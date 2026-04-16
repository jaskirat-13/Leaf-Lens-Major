import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

async function ensureProfile(user) {
  if (!user?.id || !user?.email) {
    return;
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      created_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );

  if (error) {
    throw error;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (error) {
        console.error("Failed to load auth session", error);
        setSession(null);
        setUser(null);
      } else {
        setSession(data.session || null);
        setUser(data.session?.user || null);
      }

      setLoading(false);
    };

    bootstrap();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setUser(nextSession?.user || null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    ensureProfile(session.user).catch((error) => {
      console.error("Unable to sync profile", error);
    });
  }, [session]);

  const signUp = async ({ email, password }) => {
    const emailRedirectTo = `${window.location.origin}/auth`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo
      }
    });
    if (error) throw error;

    if (data?.session?.user) {
      await ensureProfile(data.session.user);
    }

    return data;
  };

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (data?.session?.user) {
      await ensureProfile(data.session.user);
    }

    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const requestPasswordReset = async (email) => {
    const redirectTo = `${window.location.origin}/auth?mode=reset`;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    return data;
  };

  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
  };

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      requestPasswordReset,
      updatePassword
    }),
    [user, session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
