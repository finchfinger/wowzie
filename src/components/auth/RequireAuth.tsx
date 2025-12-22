// src/components/auth/RequireAuth.tsx
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Props = { children: React.ReactNode };

export const RequireAuth: React.FC<Props> = ({ children }) => {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let alive = true;

    // 1) Fast initial check
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setAuthed(!!data.session);
      setChecking(false);
    });

    // 2) React instantly to logout/login
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setAuthed(!!session);
      setChecking(false);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (checking) return null; // or a tiny spinner

  if (!authed) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};
