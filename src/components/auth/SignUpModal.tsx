// src/components/auth/SignupModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import { supabase } from "../../lib/supabase";
import { AddressInput } from "../ui/AddressInput";
import type { AddressSelection } from "../ui/AddressInput";

/** Map raw Supabase signup errors to friendly copy. */
function friendlySignupError(raw: string): string {
  if (raw.includes("already registered") || raw.includes("User already registered")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (raw.includes("Password should be")) {
    return "Password must be at least 6 characters.";
  }
  if (raw.includes("too many requests") || raw.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return raw || "Unable to create your account. Please try again.";
}

/** Simple eye / eye-off toggle button. */
const PasswordToggle: React.FC<{ show: boolean; onToggle: () => void }> = ({ show, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
    aria-label={show ? "Hide password" : "Show password"}
  >
    {show ? (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    )}
  </button>
);

type SignupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSignedUp?: () => void;
  onSwitchToLogin?: () => void;
};

type ChildDraft = {
  name: string;
  birthdate: string; // keep as string for input, store "YYYY-MM-DD"
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

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

/**
 * AddressInput's onSelect can arrive as either:
 * - AddressSelection (from Places/autocomplete selection)
 * - SyntheticEvent (if the component forwards an input event in some cases)
 *
 * We only want to read AddressSelection fields when it is truly a selection.
 */
function isAddressSelection(v: unknown): v is AddressSelection {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    "formattedAddress" in o ||
    "placeId" in o ||
    "line1" in o ||
    "city" in o ||
    "state" in o ||
    "postalCode" in o
  );
}

function parseBirthdateToAgeYears(birthdate: string): number | null {
  // birthdate expected "YYYY-MM-DD"
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
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
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

export const SignupModal: React.FC<SignupModalProps> = ({
  isOpen,
  onClose,
  onSignedUp,
  onSwitchToLogin,
}) => {
  const [step, setStep] = useState<Step>(1);

  // Step 1: account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [parentLoading, setParentLoading] = useState(false);
  const [saveChildrenLoading, setSaveChildrenLoading] = useState(false);

  // Step 2: parent details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Location
  // We keep two values:
  // - location: what we display (typed text or formatted address)
  // - locationCity: best-effort extracted city (for profiles.city)
  const [location, setLocation] = useState("");
  const [locationCity, setLocationCity] = useState("");

  // Step 3: child details (draft)
  const [childName, setChildName] = useState("");
  const [childBirthdate, setChildBirthdate] = useState(""); // YYYY-MM-DD
  const [childInterests, setChildInterests] = useState<string[]>([]);

  // Collected children (not saved until Step 4 -> Save)
  const [children, setChildren] = useState<ChildDraft[]>([]);

  const [error, setError] = useState("");

  // Reset when opened
  useEffect(() => {
    if (!isOpen) return;

    setStep(1);

    setEmail("");
    setPassword("");
    setShowPassword(false);
    setSignupLoading(false);
    setParentLoading(false);
    setSaveChildrenLoading(false);

    setFirstName("");
    setLastName("");
    setLocation("");
    setLocationCity("");

    setChildName("");
    setChildBirthdate("");
    setChildInterests([]);

    setChildren([]);

    setError("");
  }, [isOpen]);

  const handleSignInClick = () => {
    onClose();
    onSwitchToLogin?.();
  };

  // Helper: upsert into profiles (matches your schema)
  const upsertProfile = async (payload: {
    id: string;
    email?: string | null;
    legal_name?: string | null;
    preferred_first_name?: string | null;
    city?: string | null;
  }) => {
    const base = {
      updated_at: new Date().toISOString(),
      ...payload,
    };

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(base, { onConflict: "id" });

    if (profileError) {
      console.error("Error upserting profile:", profileError);
    }
  };

  // Step 1: create account
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

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    });

    setSignupLoading(false);

    if (signUpError) {
      setError(friendlySignupError(signUpError.message));
      return;
    }

    const user = data.user;
    if (user) {
      await upsertProfile({
        id: user.id,
        email: user.email,
      });
    }

    setStep(2);
  };

  // Step 2: save parent details into auth metadata + profiles
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
        setParentLoading(false);
        setError("We couldn't confirm your session. Please try again.");
        return;
      }

      const user = userResult.user;

      // Update auth metadata (best-effort)
      await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          location: location.trim() || null,
        },
      });

      const legalName = `${firstName.trim()} ${lastName.trim()}`.trim();

      await upsertProfile({
        id: user.id,
        email: user.email,
        legal_name: legalName || null,
        preferred_first_name: firstName.trim() || null,
        city: locationCity.trim() || null,
      });

      setParentLoading(false);
      setStep(3);
    } catch {
      setParentLoading(false);
      setError("We couldn't save your profile. Please try again.");
    }
  };

  // Step 3: child draft
  const toggleInterest = (interest: string) => {
    setChildInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleChildAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!childName.trim() || !childBirthdate.trim()) {
      setError("Please add your child’s name and birthdate, or choose Skip.");
      return;
    }

    const draft: ChildDraft = {
      name: childName.trim(),
      birthdate: childBirthdate.trim(),
      interests: childInterests,
    };

    setChildren((prev) => [...prev, draft]);

    // reset draft
    setChildName("");
    setChildBirthdate("");
    setChildInterests([]);

    setStep(4);
  };

  const handleSkipChildren = () => {
    setChildren([]);
    setStep(5); // success (account + profile already created)
  };

  const handleAddAnotherChild = () => {
    setChildName("");
    setChildBirthdate("");
    setChildInterests([]);
    setStep(3);
  };

  // Step 4: save children to DB
  const handleSaveChildren = async () => {
    setError("");
    setSaveChildrenLoading(true);

    try {
      const { data: userResult, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userResult.user) {
        setSaveChildrenLoading(false);
        setError("We couldn't confirm your session. Please try again.");
        return;
      }

      const parentId = userResult.user.id;

      if (children.length > 0) {
        const rows = children.map((child) => {
          const ageYears = parseBirthdateToAgeYears(child.birthdate);

          return {
            parent_id: parentId,
            legal_name: child.name,
            preferred_name: null,
            birthdate: child.birthdate,
            allergies: null,
            immunization_notes: null,
            medications: null,
            avatar_emoji: null,
            age_years: ageYears,
            interests: child.interests.length ? child.interests : null,
          };
        });

        const { error: insertError } = await supabase
          .from("children")
          .insert(rows);

        if (insertError) {
          setSaveChildrenLoading(false);
          setError(
            "We saved your account, but couldn't save child details. You can add them later."
          );
          setStep(5);
          return;
        }
      }

      setSaveChildrenLoading(false);
      setStep(5);
    } catch {
      setSaveChildrenLoading(false);
      setError(
        "We saved your account, but couldn't save child details. You can add them later."
      );
      setStep(5);
    }
  };

  const handleStartBrowsing = () => {
    onSignedUp?.();
    onClose();
  };

  // Title per step
  let title = "Create your Wowzie account";
  if (step === 2) title = "Tell us a little more";
  if (step === 3) title = "Who are you booking for?";
  if (step === 4) title = "Here’s what we have so far";
  if (step === 5) title = "Registration created";

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {/* STEP 1 */}
      {step === 1 && (
        <>
          <p className="mb-4 text-sm text-gray-600">
            Sign up to browse and book camps and classes.
          </p>

          <form onSubmit={handleAccountSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="signup-email"
                className="block text-sm font-medium text-gray-800"
              >
                Email address
              </label>
              <input
                id="signup-email"
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
              <label
                htmlFor="signup-password"
                className="block text-sm font-medium text-gray-800"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                  placeholder="Create a password (min. 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <PasswordToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
              </div>
            </div>

            <button
              type="submit"
              disabled={signupLoading}
              className="w-full inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {signupLoading ? "Creating account…" : "Sign up"}
            </button>

            <button
              type="button"
              className="w-full inline-flex items-center justify-center rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-200"
              disabled
            >
              Sign up with Google (coming soon)
            </button>
          </form>

          <div className="mt-3 text-center text-xs text-gray-600">
            Already have an account?{" "}
            <button
              type="button"
              className="font-medium text-violet-600 hover:text-violet-700"
              onClick={handleSignInClick}
            >
              Sign in
            </button>
          </div>
        </>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <>
          <p className="mb-4 text-sm text-gray-600">
            Tell us a little more so we can personalize nearby activities.
          </p>

          <form onSubmit={handleParentSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="parent-first-name"
                  className="block text-sm font-medium text-gray-800"
                >
                  First name
                </label>
                <input
                  id="parent-first-name"
                  type="text"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="parent-last-name"
                  className="block text-sm font-medium text-gray-800"
                >
                  Last name
                </label>
                <input
                  id="parent-last-name"
                  type="text"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-800">
                Where should we look for activities near you?
              </label>

              <AddressInput
                value={location}
                onChange={(next) => {
                  // typed value
                  setLocation(next);
                  setLocationCity("");
                }}
                placeholder="Neighborhood, city, or zip code"
                onSelect={(p) => {
                  if (!isAddressSelection(p)) return;

                  const formatted = p.formattedAddress || "";
                  const city = p.city || "";

                  // prefer formatted address, fall back to city
                  setLocation(formatted || city);
                  setLocationCity(city);
                }}
              />

              <p className="text-xs text-gray-500">
                We’ll use this to show nearby camps and classes.
              </p>
            </div>

            <p className="text-[11px] text-gray-500">
              By clicking the “Continue” button, you are agreeing to our{" "}
              <a href="/terms" className="underline">
                Terms of Use
              </a>
              , opening an account with Wowzie, and acknowledging you have read our{" "}
              <a href="/privacy" className="underline">
                Privacy Notice
              </a>
              .
            </p>

            <button
              type="submit"
              disabled={parentLoading}
              className="w-full inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {parentLoading ? "Saving…" : "Continue"}
            </button>
          </form>
        </>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <>
          <p className="mb-4 text-sm text-gray-600">
            Add your child’s info to help us show age-appropriate options.
          </p>

          <form onSubmit={handleChildAdd} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="child-name"
                className="block text-sm font-medium text-gray-800"
              >
                What’s your child’s name?
              </label>
              <input
                id="child-name"
                type="text"
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="child-birthdate"
                className="block text-sm font-medium text-gray-800"
              >
                What’s their birthdate?
              </label>
              <input
                id="child-birthdate"
                type="date"
                max={todayISO}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                value={childBirthdate}
                onChange={(e) => setChildBirthdate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-800">
                What are their interests?
              </p>

              <div className="grid grid-cols-2 gap-2 text-sm">
                {ALL_INTERESTS.map((interest) => {
                  const selected = childInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={cx(
                        "flex items-center justify-between rounded-lg border px-3 py-2",
                        selected
                          ? "border-violet-600 bg-violet-50"
                          : "border-gray-300 bg-white"
                      )}
                    >
                      <span>{interest}</span>
                      <span
                        className={cx(
                          "h-4 w-4 rounded border",
                          selected
                            ? "border-violet-600 bg-violet-600"
                            : "border-gray-300 bg-white"
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleSkipChildren}
                className="flex-1 inline-flex items-center justify-center rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-200"
              >
                Skip
              </button>
              <button
                type="submit"
                className="flex-1 inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black"
              >
                Continue
              </button>
            </div>
          </form>
        </>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <>
          {children.length > 0 ? (
            <div className="mb-4 space-y-3 text-sm text-gray-800">
              {children.map((child, idx) => (
                <div
                  key={`${child.name}-${idx}`}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <div className="font-medium">{child.name}</div>
                  <div className="text-xs text-gray-600">
                    Birthdate {child.birthdate || "—"}
                  </div>
                  {child.interests.length > 0 && (
                    <div className="mt-1 text-xs text-gray-700">
                      Interests: {child.interests.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-4 text-sm text-gray-600">
              You haven’t added any children yet. You can always add them later.
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleAddAnotherChild}
              className="inline-flex items-center justify-center rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-200"
            >
              Add another child
            </button>

            <button
              type="button"
              onClick={handleSaveChildren}
              disabled={saveChildrenLoading}
              className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saveChildrenLoading ? "Saving…" : "Save"}
            </button>
          </div>
        </>
      )}

      {/* STEP 5 */}
      {step === 5 && (
        <div className="flex flex-col items-center space-y-4 py-4 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-600">
            ✓
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-800">
              You're in!
            </p>
            <p className="max-w-xs text-sm text-gray-600">
              Your account is ready. Check your inbox — we sent a quick
              verification email to <span className="font-medium">{email}</span>.
            </p>
            <p className="max-w-xs text-xs text-gray-500">
              You can browse now and verify later. Some features may require a
              verified email.
            </p>
          </div>

          <button
            type="button"
            onClick={handleStartBrowsing}
            className="mt-2 inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black"
          >
            Start browsing
          </button>
        </div>
      )}

      {/* Shared error row */}
      {error && step !== 5 && (
        <p className="mt-4 text-xs text-rose-600">{error}</p>
      )}
    </Modal>
  );
};

export default SignupModal;
