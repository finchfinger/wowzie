import React, { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { supabase } from "../../lib/supabase";

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSignedIn?: () => void;
  onSwitchToSignup?: () => void;
};

/** Map raw Supabase error messages to friendly copy. */
function friendlyLoginError(raw: string): string {
  if (raw.includes("Invalid login credentials")) {
    return "Incorrect email or password. Please try again.";
  }
  if (raw.includes("Email not confirmed")) {
    return "Please confirm your email before signing in. Check your inbox for a verification link.";
  }
  if (raw.includes("too many requests") || raw.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return raw || "Unable to sign you in. Please try again.";
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSignedIn,
  onSwitchToSignup,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Forgot-password sub-flow
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  // Reset when opening
  useEffect(() => {
    if (!isOpen) return;
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setLoading(false);
    setError("");
    setForgotMode(false);
    setResetEmail("");
    setResetSent(false);
    setResetLoading(false);
    setResetError("");
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(friendlyLoginError(signInError.message));
      return;
    }

    if (data?.user) {
      onSignedIn?.();
      onClose();
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");

    const trimmed = resetEmail.trim();
    if (!trimmed) {
      setResetError("Please enter your email address.");
      return;
    }

    setResetLoading(true);

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/settings/login`,
    });

    setResetLoading(false);

    if (resetErr) {
      setResetError(resetErr.message || "Unable to send reset email. Please try again.");
      return;
    }

    setResetSent(true);
  };

  const handleCreateAccountClick = () => {
    onClose();
    onSwitchToSignup?.();
  };

  // ── Forgot password flow ───────────────────────────────────────────────────
  if (forgotMode) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Reset your password">
        {resetSent ? (
          <div className="space-y-4 py-2 text-center">
            <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-600">
              ✓
            </div>
            <p className="text-sm text-gray-700">
              Check your inbox — we sent a reset link to{" "}
              <span className="font-medium">{resetEmail.trim()}</span>.
            </p>
            <p className="text-xs text-gray-500">
              Didn't get it? Check your spam folder or{" "}
              <button
                type="button"
                className="text-violet-600 hover:text-violet-700 underline"
                onClick={() => { setResetSent(false); setResetEmail(""); }}
              >
                try a different address
              </button>
              .
            </p>
            <button
              type="button"
              className="mt-2 text-sm text-violet-600 hover:text-violet-700"
              onClick={() => setForgotMode(false)}
            >
              ← Back to sign in
            </button>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-600">
              Enter the email you signed up with and we'll send you a reset link.
            </p>
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-800">
                  Email address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                  placeholder="you@youremail.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
              </div>

              {resetError && (
                <p className="text-xs text-rose-600">{resetError}</p>
              )}

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resetLoading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <button
              type="button"
              className="mt-4 text-sm text-violet-600 hover:text-violet-700"
              onClick={() => setForgotMode(false)}
            >
              ← Back to sign in
            </button>
          </>
        )}
      </Modal>
    );
  }

  // ── Normal sign-in ─────────────────────────────────────────────────────────
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Welcome back">
      <p className="mb-4 text-sm text-gray-600">
        Sign in to save camps, manage your kids, and book faster.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="block text-sm font-medium text-gray-800">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
            placeholder="you@youremail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="login-password" className="block text-sm font-medium text-gray-800">
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                // eye-off
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                // eye
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs text-rose-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
        <button
          type="button"
          className="text-violet-600 hover:text-violet-700"
          onClick={() => { setForgotMode(true); setResetEmail(email); }}
        >
          Forgot password?
        </button>

        <button
          type="button"
          className="text-violet-600 hover:text-violet-700"
          onClick={handleCreateAccountClick}
        >
          Create account
        </button>
      </div>
    </Modal>
  );
};

export default LoginModal;
