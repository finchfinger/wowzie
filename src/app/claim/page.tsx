"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ClaimState =
  | { step: "loading" }
  | { step: "invalid"; message: string }
  | { step: "form"; orgName: string }
  | { step: "verify_email" }
  | { step: "claiming" }
  | { step: "done"; orgName: string };

export default function ClaimPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [state, setState] = useState<ClaimState>({ step: "loading" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Verify the token on load
  useEffect(() => {
    if (!token) { setState({ step: "invalid", message: "No claim token provided." }); return; }
    const verify = async () => {
      const res = await fetch(`/api/claim?token=${encodeURIComponent(token)}`);
      const json = await res.json() as { legal_name?: string; error?: string };
      if (!res.ok) {
        setState({ step: "invalid", message: json.error ?? "Invalid or expired link." });
      } else {
        setState({ step: "form", orgName: json.legal_name ?? "your organization" });
      }
    };
    void verify();
  }, [token]);

  // After Supabase email confirmation, complete the claim
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session) {
        if (state.step === "verify_email" || state.step === "claiming") {
          setState({ step: "claiming" });
          const res = await fetch("/api/claim", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ token }),
          });
          const json = await res.json() as { ok?: boolean; error?: string };
          if (res.ok && json.ok) {
            const orgName = state.step === "verify_email" ? "your organization" : (state as any).orgName ?? "your organization";
            setState({ step: "done", orgName });
          } else {
            setFormError(json.error ?? "Something went wrong. Please try again.");
            setState((prev) => (prev.step === "claiming" ? { step: "form", orgName: (prev as any).orgName ?? "" } : prev));
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [token, state.step]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setFormError("Please enter your email and password."); return; }
    setFormError(null);
    setSubmitting(true);

    try {
      // Try sign up first
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        if (signUpError.message.toLowerCase().includes("already") || signUpError.message.toLowerCase().includes("registered")) {
          // Existing account — sign in
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) { setFormError(signInError.message); setSubmitting(false); return; }
          // Auth state change will handle the claim
        } else {
          setFormError(signUpError.message);
          setSubmitting(false);
          return;
        }
      } else {
        // New account — may need email verification
        setState({ step: "verify_email" });
        setSubmitting(false);
        return;
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  /* ── Render ── */

  if (state.step === "loading") {
    return (
      <main className="flex items-center justify-center min-h-[calc(100dvh-72px)]">
        <p className="text-sm text-muted-foreground animate-pulse">Verifying claim link…</p>
      </main>
    );
  }

  if (state.step === "invalid") {
    return (
      <main className="flex items-center justify-center min-h-[calc(100dvh-72px)] px-4">
        <div className="text-center max-w-sm space-y-3">
          <span className="material-symbols-outlined text-4xl text-destructive block">link_off</span>
          <p className="text-base font-semibold text-foreground">Invalid link</p>
          <p className="text-sm text-muted-foreground">{state.message}</p>
          <p className="text-xs text-muted-foreground">
            Contact{" "}
            <a href="mailto:hey@heywowzi.com" className="underline">hey@heywowzi.com</a>
            {" "}if you think this is a mistake.
          </p>
        </div>
      </main>
    );
  }

  if (state.step === "done") {
    return (
      <main className="flex items-center justify-center min-h-[calc(100dvh-72px)] px-4">
        <div className="text-center max-w-sm space-y-3">
          <span className="material-symbols-outlined text-4xl text-emerald-600 block">check_circle</span>
          <p className="text-base font-semibold text-foreground">Listing claimed!</p>
          <p className="text-sm text-muted-foreground">
            You now have access to manage <strong>{state.orgName}</strong> on Wowzi.
          </p>
          <Button onClick={() => router.push("/")} className="mt-2">Go to homepage</Button>
        </div>
      </main>
    );
  }

  if (state.step === "verify_email") {
    return (
      <main className="flex items-center justify-center min-h-[calc(100dvh-72px)] px-4">
        <div className="text-center max-w-sm space-y-3">
          <span className="material-symbols-outlined text-4xl text-violet-600 block">mark_email_unread</span>
          <p className="text-base font-semibold text-foreground">Check your email</p>
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to <strong>{email}</strong>. Click it to complete your claim.
          </p>
        </div>
      </main>
    );
  }

  const orgName = state.step === "form" ? state.orgName : "";

  return (
    <main className="flex items-center justify-center min-h-[calc(100dvh-72px)] px-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center space-y-1">
          <span className="material-symbols-outlined text-4xl text-violet-600 block">lock_open</span>
          <h1 className="text-xl font-semibold text-foreground">Claim {orgName}</h1>
          <p className="text-sm text-muted-foreground">
            Create an account to manage your listing on Wowzi.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="claim-email">
              Email
            </label>
            <Input
              id="claim-email"
              type="email"
              placeholder="you@yourorg.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="claim-password">
              Password
            </label>
            <Input
              id="claim-password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {formError && (
            <p className="text-xs text-destructive">{formError}</p>
          )}

          <Button type="submit" className="w-full" disabled={submitting || state.step === "claiming"}>
            {submitting || state.step === "claiming" ? "Working…" : "Claim listing"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <button
            type="button"
            className="underline text-foreground"
            onClick={async () => {
              const { error } = await supabase.auth.signInWithPassword({ email, password });
              if (error) setFormError(error.message);
            }}
          >
            Sign in
          </button>
        </p>

      </div>
    </main>
  );
}
