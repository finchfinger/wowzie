"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff } from "lucide-react";

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSignedIn?: () => void;
  onSwitchToSignup?: () => void;
};

type View = "login" | "forgot" | "forgot_sent";

function friendlyLoginError(msg: string): string {
  if (!msg) return "Unable to sign you in. Please try again.";
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid credentials")) {
    return "Incorrect email or password. Please try again.";
  }
  if (m.includes("email not confirmed")) {
    return "Please verify your email before signing in. Check your inbox.";
  }
  if (m.includes("too many requests") || m.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Connection issue. Check your internet and try again.";
  }
  return "Unable to sign you in. Please try again.";
}

export function LoginModal({
  isOpen,
  onClose,
  onSignedIn,
  onSwitchToSignup,
}: LoginModalProps) {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setView("login");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setLoading(false);
    setError("");
    setForgotEmail("");
    setForgotLoading(false);
    setForgotError("");
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(friendlyLoginError(authError.message));
        return;
      }

      onSignedIn?.();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");

    const trimmed = forgotEmail.trim();
    if (!trimmed) {
      setForgotError("Please enter your email address.");
      return;
    }

    setForgotLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/settings?tab=login`,
      });

      if (resetError) {
        setForgotError("We couldn't send a reset link. Please try again.");
        return;
      }

      setView("forgot_sent");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleCreateAccountClick = () => {
    onClose();
    onSwitchToSignup?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">

        {/* ── LOGIN VIEW ── */}
        {view === "login" && (
          <>
            <h2 className="text-lg font-semibold text-foreground">Welcome back</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Sign in to save camps, manage your kids, and book faster.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="block text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground outline-none hover:bg-gray-50 focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-colors"
                  placeholder="you@youremail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password" className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className="block w-full rounded-lg border border-input bg-transparent px-3 py-2 pr-10 text-sm placeholder:text-muted-foreground outline-none hover:bg-gray-50 focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-colors"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <button
                type="button"
                className="text-primary hover:text-primary/80 transition-colors"
                onClick={() => { setForgotEmail(email); setView("forgot"); setError(""); }}
              >
                Forgot password?
              </button>
              <button
                type="button"
                className="text-primary hover:text-primary/80 transition-colors"
                onClick={handleCreateAccountClick}
              >
                Create account
              </button>
            </div>
          </>
        )}

        {/* ── FORGOT PASSWORD VIEW ── */}
        {view === "forgot" && (
          <>
            <button
              type="button"
              onClick={() => { setView("login"); setForgotError(""); }}
              className="mb-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to sign in
            </button>
            <h2 className="text-lg font-semibold text-foreground">Reset your password</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="forgot-email" className="block text-sm font-medium text-foreground">
                  Email address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground outline-none hover:bg-gray-50 focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-colors"
                  placeholder="you@youremail.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  disabled={forgotLoading}
                />
              </div>

              {forgotError && <p className="text-xs text-destructive">{forgotError}</p>}

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {forgotLoading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </>
        )}

        {/* ── FORGOT SENT VIEW ── */}
        {view === "forgot_sent" && (
          <div className="flex flex-col items-center space-y-4 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
              ✉️
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Check your inbox</h2>
              <p className="max-w-xs text-sm text-muted-foreground">
                We sent a password reset link to <span className="font-medium text-foreground">{forgotEmail}</span>.
                Check your spam folder if you don&apos;t see it within a minute.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setView("login")}
              className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
