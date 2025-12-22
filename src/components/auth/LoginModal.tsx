import React, { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { supabase } from "../../lib/supabase";

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSignedIn?: () => void;
  onSwitchToSignup?: () => void;
};

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSignedIn,
  onSwitchToSignup,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Reset when opening
  useEffect(() => {
    if (!isOpen) return;
    setEmail("");
    setPassword("");
    setStatus("");
    setError("");
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatus("Signing you in…");

    if (!email || !password) {
      setError("Please enter your email and password.");
      setStatus("");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      console.error("signInWithPassword error:", error);
      const message =
        error.message === "Invalid login credentials"
          ? "Incorrect email or password."
          : error.message;
      setError(message || "Unable to sign you in. Please try again.");
      setStatus("");
      return;
    }

    console.log("Signed in as:", data?.user?.email);
    setStatus("Signed in. Closing…");

    onSignedIn?.();
    onClose();
  };

  const handleCreateAccountClick = () => {
    // Let the parent decide how to switch
    onClose();
    onSwitchToSignup?.();
  };

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
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="w-full inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          Sign in
        </button>
      </form>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
        <button type="button" className="text-violet-600 hover:text-violet-700">
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

      <p className="mt-3 text-xs text-gray-500 min-h-[1.25rem]">{status}</p>
      <p className="text-xs text-rose-600 min-h-[1.25rem]">{error}</p>
    </Modal>
  );
};

export default LoginModal;
