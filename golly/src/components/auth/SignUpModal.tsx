"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff } from "lucide-react";

type SignupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSignedUp?: () => void;
  onSwitchToLogin?: () => void;
};

type ChildDraft = {
  name: string;
  birthdate: string;
  interests: string[];
};

type Step = 1 | 2 | 3 | 4 | 5;

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
  const hasHadBirthdayThisYear =
    nowUTC.getUTCMonth() > dob.getUTCMonth() ||
    (nowUTC.getUTCMonth() === dob.getUTCMonth() &&
      nowUTC.getUTCDate() >= dob.getUTCDate());

  if (!hasHadBirthdayThisYear) age -= 1;
  if (age < 0 || age > 120) return null;

  return age;
}

function friendlySignupError(msg: string): string {
  if (!msg) return "Unable to create your account. Please try again.";
  const m = msg.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists") || m.includes("user already")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (m.includes("password") && (m.includes("weak") || m.includes("short") || m.includes("length"))) {
    return "Password must be at least 6 characters.";
  }
  if (m.includes("invalid email") || m.includes("email address")) {
    return "Please enter a valid email address.";
  }
  if (m.includes("too many requests") || m.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Connection issue. Check your internet and try again.";
  }
  return "Unable to create your account. Please try again.";
}

export function SignUpModal({
  isOpen,
  onClose,
  onSignedUp,
  onSwitchToLogin,
}: SignupModalProps) {
  const [step, setStep] = useState<Step>(1);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [location, setLocation] = useState("");

  const [childName, setChildName] = useState("");
  const [childBirthdate, setChildBirthdate] = useState("");
  const [childInterests, setChildInterests] = useState<string[]>([]);

  const [children, setChildren] = useState<ChildDraft[]>([]);

  const [signupLoading, setSignupLoading] = useState(false);
  const [parentLoading, setParentLoading] = useState(false);
  const [saveChildrenLoading, setSaveChildrenLoading] = useState(false);

  const [error, setError] = useState("");

  // Email used during signup, shown on confirmation screen
  const [signedUpEmail, setSignedUpEmail] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setFirstName("");
    setLastName("");
    setLocation("");
    setChildName("");
    setChildBirthdate("");
    setChildInterests([]);
    setChildren([]);
    setSignupLoading(false);
    setParentLoading(false);
    setSaveChildrenLoading(false);
    setError("");
    setSignedUpEmail("");
  }, [isOpen]);

  const upsertProfile = async (payload: {
    id: string;
    email?: string | null;
    legal_name?: string | null;
    preferred_first_name?: string | null;
    city?: string | null;
  }) => {
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ updated_at: new Date().toISOString(), ...payload }, { onConflict: "id" });
    if (profileError) console.error("Error upserting profile:", profileError);
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSignupLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });

      if (signUpError) {
        setError(friendlySignupError(signUpError.message));
        return;
      }

      if (data.user) {
        await upsertProfile({ id: data.user.id, email: data.user.email });
      }

      setSignedUpEmail(trimmedEmail);
      setStep(2);
    } finally {
      setSignupLoading(false);
    }
  };

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

      await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          location: location.trim() || null,
        },
      });

      const legalName = `${firstName.trim()} ${lastName.trim()}`.trim();
      await upsertProfile({
        id: userResult.user.id,
        email: userResult.user.email,
        legal_name: legalName || null,
        preferred_first_name: firstName.trim() || null,
        city: location.trim() || null,
      });

      setStep(3);
    } catch {
      setError("We couldn't save your profile. Please try again.");
    } finally {
      setParentLoading(false);
    }
  };

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
    setStep(4);
  };

  const handleSkipChildren = () => {
    setChildren([]);
    setStep(5);
  };

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
          allergies: null,
          immunization_notes: null,
          medications: null,
          avatar_emoji: null,
          age_years: child.birthdate ? parseBirthdateToAgeYears(child.birthdate) : null,
          interests: child.interests.length ? child.interests : null,
        }));

        const { error: insertError } = await supabase
          .from("children")
          .insert(rows);

        if (insertError) {
          console.error("Error inserting children:", insertError);
          setError(
            "We saved your account, but couldn't save child details. You can add them later.",
          );
          setStep(5);
          return;
        }
      }

      setStep(5);
    } catch {
      setError(
        "We saved your account, but couldn't save child details. You can add them later.",
      );
      setStep(5);
    } finally {
      setSaveChildrenLoading(false);
    }
  };

  const handleStartBrowsing = () => {
    onSignedUp?.();
    onClose();
  };

  let title = "Create your Golly account";
  if (step === 2) title = "Tell us a little more";
  if (step === 3) title = "Who are you booking for?";
  if (step === 4) title = "Here\u2019s what we have so far";
  if (step === 5) title = "You\u2019re almost in!";

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const inputClass =
    "block w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground outline-none hover:bg-gray-50 focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-colors";

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
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>

        {/* ── STEP 1: Email + Password ── */}
        {step === 1 && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Sign up to browse and book camps and classes.
            </p>
            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="signup-email" className="block text-sm font-medium text-foreground">
                  Email address
                </label>
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  required
                  className={inputClass}
                  placeholder="you@youremail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={signupLoading}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="signup-password" className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    className={`${inputClass} pr-10`}
                    placeholder="Create a password (min. 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={signupLoading}
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
                disabled={signupLoading}
                className="w-full inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {signupLoading ? "Creating your account…" : "Sign up"}
              </button>
            </form>
            <div className="mt-3 text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
                onClick={() => {
                  onClose();
                  onSwitchToLogin?.();
                }}
              >
                Sign in
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: Parent info ── */}
        {step === 2 && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Tell us a little more so we can personalise nearby activities.
            </p>
            <form onSubmit={handleParentSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="parent-first-name" className="block text-sm font-medium text-foreground">
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
                  <label htmlFor="parent-last-name" className="block text-sm font-medium text-foreground">
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
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Neighbourhood, city, or zip code"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={parentLoading}
                />
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={parentLoading}
                className="w-full inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {parentLoading ? "Saving…" : "Continue"}
              </button>
            </form>
          </>
        )}

        {/* ── STEP 3: Child info ── */}
        {step === 3 && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Add your child&apos;s info to help us show age-appropriate options.
            </p>
            <form onSubmit={handleChildAdd} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="child-name" className="block text-sm font-medium text-foreground">
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
                <label htmlFor="child-birthdate" className="block text-sm font-medium text-foreground">
                  Birthdate <span className="font-normal text-muted-foreground">(optional)</span>
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

        {/* ── STEP 4: Review children ── */}
        {step === 4 && (
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

            {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setChildName("");
                  setChildBirthdate("");
                  setChildInterests([]);
                  setStep(3);
                }}
                className="inline-flex items-center justify-center rounded-lg bg-muted px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
              >
                Add another child
              </button>
              <button
                type="button"
                onClick={handleSaveChildren}
                disabled={saveChildrenLoading}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {saveChildrenLoading ? "Saving…" : "Save and continue"}
              </button>
            </div>
          </>
        )}

        {/* ── STEP 5: Success / Email verification ── */}
        {step === 5 && (
          <div className="flex flex-col items-center space-y-4 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
              ✉️
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Check your email to verify your account
              </p>
              <p className="max-w-xs text-sm text-muted-foreground">
                We sent a verification link to{" "}
                <span className="font-medium text-foreground">{signedUpEmail || "your email"}</span>.
                Click it to activate your account, then sign in.
              </p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Didn&apos;t get it? Check your spam folder.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartBrowsing}
              className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Continue browsing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
