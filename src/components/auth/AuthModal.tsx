"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AddressInput } from "@/components/ui/AddressInput";

// ── Types ──────────────────────────────────────────────────────────────────

type Step = "email" | "code" | "parent" | "child" | "review";

// ── Google SVG icon ─────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

type ChildDraft = {
  name: string;
  birthdate: string;
  interests: string[];
};

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSignedIn?: () => void;
};

// ── Constants ──────────────────────────────────────────────────────────────

const ALL_INTERESTS = [
  "Sports",
  "STEM",
  "Music",
  "Dance",
  "Day camps",
  "Arts",
  "Outdoors",
  "Cooking",
  "Drama",
  "Overnight camps",
];

// ── OTP digit boxes ─────────────────────────────────────────────────────────

function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));

  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const handleChange = (idx: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = digit;
    onChange(next.join(""));
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[idx]) {
        // Clear current cell
        const next = [...digits];
        next[idx] = "";
        onChange(next.join(""));
      } else if (idx > 0) {
        // Move back
        inputRefs.current[idx - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(text.padEnd(6, "").slice(0, 6).trimEnd());
    const focusIdx = Math.min(text.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleClipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const nums = text.replace(/\D/g, "").slice(0, 6);
      onChange(nums);
      inputRefs.current[Math.min(nums.length, 5)]?.focus();
    } catch {
      // clipboard permission denied — ignore
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {digits.map((d, idx) => (
          <input
            key={idx}
            ref={(el) => { inputRefs.current[idx] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
            autoFocus={idx === 0}
            className={`h-14 w-full min-w-0 rounded-xl border-2 text-center text-xl font-semibold outline-none transition-colors bg-background
              ${d ? "border-foreground/60" : "border-input"}
              focus:border-foreground disabled:opacity-50`}
          />
        ))}
      </div>

      {/* Paste + actions row */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleClipboardPaste}
          className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
        >
          {/* Clipboard icon */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="4" rx="1" />
            <path d="M9 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-3" />
          </svg>
          Paste code
        </button>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function parseBirthdateToAgeYears(birthdate: string): number | null {
  if (!birthdate) return null;
  const [yStr, mStr, dStr] = birthdate.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!y || !m || !d) return null;

  const dob = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  const nowUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  let age = nowUTC.getUTCFullYear() - dob.getUTCFullYear();
  const hasHadBirthday =
    nowUTC.getUTCMonth() > dob.getUTCMonth() ||
    (nowUTC.getUTCMonth() === dob.getUTCMonth() &&
      nowUTC.getUTCDate() >= dob.getUTCDate());
  if (!hasHadBirthday) age -= 1;
  if (age < 0 || age > 120) return null;
  return age;
}

function friendlyOtpError(msg: string): string {
  if (!msg) return "Something went wrong. Please try again.";
  const m = msg.toLowerCase();
  if (
    m.includes("invalid") ||
    m.includes("expired") ||
    m.includes("token") ||
    m.includes("otp")
  ) {
    return "That code is incorrect or has expired. Please try again.";
  }
  if (m.includes("too many") || m.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Connection issue. Check your internet and try again.";
  }
  return "Something went wrong. Please try again.";
}

// ── Component ──────────────────────────────────────────────────────────────

export function AuthModal({ isOpen, onClose, onSignedIn }: AuthModalProps) {
  const [step, setStep] = useState<Step>("email");

  // Email + code
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Parent info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [location, setLocation] = useState("");
  const [parentLoading, setParentLoading] = useState(false);

  // Child info
  const [childName, setChildName] = useState("");
  const [childBirthdate, setChildBirthdate] = useState("");
  const [childInterests, setChildInterests] = useState<string[]>([]);
  const [children, setChildren] = useState<ChildDraft[]>([]);
  const [saveChildrenLoading, setSaveChildrenLoading] = useState(false);

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Reset all state when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setStep("email");
    setEmail("");
    setCode("");
    setLoading(false);
    setError("");
    setResendCooldown(0);
    setFirstName("");
    setLastName("");
    setLocation("");
    setChildName("");
    setChildBirthdate("");
    setChildInterests([]);
    setChildren([]);
  }, [isOpen]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // ── Google OAuth ─────────────────────────────────────────────────────────

  const handleGoogleSignIn = async () => {
    const next = typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  // ── Step: Email — send OTP ───────────────────────────────────────────────

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { shouldCreateUser: true },
      });
      if (otpError) {
        setError(friendlyOtpError(otpError.message));
        return;
      }
      setResendCooldown(60);
      setStep("code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setError("");
    setLoading(true);
    try {
      await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      setResendCooldown(60);
    } finally {
      setLoading(false);
    }
  };

  // ── Step: Code — verify OTP ──────────────────────────────────────────────

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedCode = code.trim();
    if (!trimmedCode || trimmedCode.length < 6) {
      setError("Please enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: trimmedCode,
        type: "email",
      });
      if (verifyError) {
        setError(friendlyOtpError(verifyError.message));
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        setError("Something went wrong. Please try again.");
        return;
      }

      // Check if this is a returning user (has a profile with a name)
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, legal_name")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.legal_name) {
        // Returning user — profile already complete
        onSignedIn?.();
        onClose();
      } else {
        // New user — start onboarding
        setStep("parent");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step: Parent info ────────────────────────────────────────────────────

  const handleParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please provide your first and last name.");
      return;
    }
    setParentLoading(true);
    try {
      const { data: userResult, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userResult.user) {
        setError("We couldn't confirm your session. Please try again.");
        return;
      }

      const legalName = `${firstName.trim()} ${lastName.trim()}`.trim();

      await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          location: location.trim() || null,
        },
      });

      const { error: upsertError } = await supabase.from("profiles").upsert(
        {
          id: userResult.user.id,
          email: userResult.user.email,
          legal_name: legalName,
          preferred_first_name: firstName.trim(),
          city: location.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

      if (upsertError) {
        console.error("Profile upsert failed:", upsertError);
        setError("We couldn't save your profile. Please try again.");
        return;
      }

      setStep("child");
    } catch {
      setError("We couldn't save your profile. Please try again.");
    } finally {
      setParentLoading(false);
    }
  };

  // ── Step: Child info ─────────────────────────────────────────────────────

  const toggleInterest = (interest: string) => {
    setChildInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  };

  const handleChildAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!childName.trim()) {
      setError("Please add your child's name, or choose Skip.");
      return;
    }
    setChildren((prev) => [
      ...prev,
      {
        name: childName.trim(),
        birthdate: childBirthdate.trim(),
        interests: childInterests,
      },
    ]);
    setChildName("");
    setChildBirthdate("");
    setChildInterests([]);
    setStep("review");
  };

  const handleSkipChildren = () => {
    // No children to save — finish onboarding immediately
    onSignedIn?.();
    onClose();
  };

  // ── Step: Review — save children & finish ────────────────────────────────

  const handleSaveChildren = async () => {
    setError("");
    setSaveChildrenLoading(true);
    try {
      const { data: userResult, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userResult.user) {
        setError("We couldn't confirm your session.");
        return;
      }

      if (children.length > 0) {
        const rows = children.map((child) => ({
          parent_id: userResult.user!.id,
          legal_name: child.name,
          preferred_name: null,
          birthdate: child.birthdate || null,
          age_years: child.birthdate
            ? parseBirthdateToAgeYears(child.birthdate)
            : null,
          interests: child.interests.length ? child.interests : null,
          allergies: null,
          immunization_notes: null,
          medications: null,
          avatar_emoji: null,
        }));

        const { error: insertError } = await supabase
          .from("children")
          .insert(rows);

        if (insertError) {
          console.error("Error inserting children:", insertError);
          // Non-fatal — still finish onboarding
        }
      }

      onSignedIn?.();
      onClose();
    } catch {
      // Non-fatal — children can be added later
      onSignedIn?.();
      onClose();
    } finally {
      setSaveChildrenLoading(false);
    }
  };

  // ── Shared style helpers ─────────────────────────────────────────────────

  const inputClass =
    "block w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground outline-none hover:bg-gray-50 focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-colors";

  const btnPrimary =
    "w-full inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors";

  // ── Titles per step ──────────────────────────────────────────────────────

  const titles: Record<Step, string> = {
    email: "Welcome to Wowzi 👋",
    code: "Check your email",
    parent: "Tell us a little more",
    child: "Who are you booking for?",
    review: "Here\u2019s what we have so far",
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
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">

        {/* Back arrow — code step only */}
        {step === "code" && (
          <button
            type="button"
            onClick={() => { setStep("email"); setCode(""); setError(""); }}
            className="mb-4 inline-flex items-center justify-center h-9 w-9 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
            aria-label="Back"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
        )}

        <h2 className="text-lg font-semibold text-foreground">{titles[step]}</h2>

        {/* ── STEP: Email ── */}
        {step === "email" && (
          <>
            <p className="mb-5 text-sm text-muted-foreground">
              Sign in or create an account to save camps, book classes, and manage your kids&apos; profiles.
            </p>

            {/* Email form */}
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="auth-email"
                  className="block text-sm font-medium text-foreground"
                >
                  Email address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  required
                  className={inputClass}
                  placeholder="you@youremail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <button type="submit" disabled={loading} className={btnPrimary}>
                {loading ? "Sending code…" : "Continue with Email"}
              </button>
            </form>

            {/* Divider */}
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Google button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full inline-flex items-center justify-center gap-2.5 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </>
        )}

        {/* ── STEP: Code ── */}
        {step === "code" && (
          <>
            <p className="mb-5 text-sm text-muted-foreground">
              Please enter the 6-digit code we sent to{" "}
              <span className="font-semibold text-foreground">{email}</span>.
            </p>
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <OtpInput value={code} onChange={setCode} disabled={loading} />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={loading || code.length < 6}
                className={btnPrimary}
              >
                {loading ? "Verifying…" : "Continue"}
              </button>
            </form>
            <div className="mt-4 text-right text-sm text-muted-foreground">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                className="disabled:cursor-default transition-colors disabled:text-muted-foreground text-foreground font-medium hover:opacity-70"
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
              </button>
            </div>
          </>
        )}

        {/* ── STEP: Parent info ── */}
        {step === "parent" && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Tell us a little more so we can personalise nearby activities.
            </p>
            <form onSubmit={handleParentSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="parent-first-name"
                    className="block text-sm font-medium text-foreground"
                  >
                    First name
                  </label>
                  <input
                    id="parent-first-name"
                    type="text"
                    className={inputClass}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={parentLoading}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="parent-last-name"
                    className="block text-sm font-medium text-foreground"
                  >
                    Last name
                  </label>
                  <input
                    id="parent-last-name"
                    type="text"
                    className={inputClass}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={parentLoading}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Where should we look for activities?
                </label>
                <AddressInput
                  mode="city"
                  value={location}
                  onChange={setLocation}
                  onSelect={(sel) => {
                    const label = [sel.city, sel.state]
                      .filter(Boolean)
                      .join(", ");
                    setLocation(label || sel.formattedAddress || location);
                  }}
                  placeholder="City, neighbourhood, or zip code"
                  disabled={parentLoading}
                  className="h-10"
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={parentLoading}
                className={btnPrimary}
              >
                {parentLoading ? "Saving…" : "Continue"}
              </button>
            </form>
          </>
        )}

        {/* ── STEP: Child info ── */}
        {step === "child" && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Add your child&apos;s info to help us show age-appropriate options.
            </p>
            <form onSubmit={handleChildAdd} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="child-name"
                  className="block text-sm font-medium text-foreground"
                >
                  Child&apos;s name
                </label>
                <input
                  id="child-name"
                  type="text"
                  className={inputClass}
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="child-birthdate"
                  className="block text-sm font-medium text-foreground"
                >
                  Birthdate{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <input
                  id="child-birthdate"
                  type="date"
                  max={todayISO}
                  className={inputClass}
                  value={childBirthdate}
                  onChange={(e) => setChildBirthdate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Interests</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {ALL_INTERESTS.map((interest) => {
                    const selected = childInterests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-colors ${
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-input bg-background hover:bg-muted/50"
                        }`}
                      >
                        <span>{interest}</span>
                        <span
                          className={`h-4 w-4 rounded border transition-colors ${
                            selected
                              ? "border-primary bg-primary"
                              : "border-input bg-background"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSkipChildren}
                  className="flex-1 inline-flex items-center justify-center rounded-lg bg-muted px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Continue
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── STEP: Review children ── */}
        {step === "review" && (
          <>
            {children.length > 0 ? (
              <div className="mb-4 space-y-3 text-sm">
                {children.map((child, idx) => (
                  <div
                    key={`${child.name}-${idx}`}
                    className="rounded-lg border border-border bg-muted px-3 py-2"
                  >
                    <div className="font-medium">{child.name}</div>
                    {child.birthdate && (
                      <div className="text-xs text-muted-foreground">
                        Birthdate: {child.birthdate}
                      </div>
                    )}
                    {child.interests.length > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Interests: {child.interests.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mb-4 text-sm text-muted-foreground">
                You haven&apos;t added any children yet.
              </p>
            )}
            {error && (
              <p className="mb-3 text-xs text-destructive">{error}</p>
            )}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setChildName("");
                  setChildBirthdate("");
                  setChildInterests([]);
                  setStep("child");
                }}
                className="inline-flex items-center justify-center rounded-lg bg-muted px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
              >
                Add another child
              </button>
              <button
                type="button"
                onClick={handleSaveChildren}
                disabled={saveChildrenLoading}
                className={btnPrimary}
              >
                {saveChildrenLoading ? "Saving…" : "Save and continue"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
