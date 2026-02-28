"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { LoginModal } from "@/components/auth/LoginModal";
import { SignUpModal } from "@/components/auth/SignUpModal";

/* ── states ─────────────────────────────────────────── */

type Status = "loading" | "success" | "error" | "needs-login" | "no-token";

/* ── inner component (needs useSearchParams inside Suspense) ── */

function AcceptShareInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const { user } = useAuth();
  const isLoggedIn = !!user;

  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("no-token");
      return;
    }

    if (!isLoggedIn) {
      setStatus("needs-login");
      return;
    }

    // Auto-accept when signed in
    const accept = async () => {
      setStatus("loading");
      try {
        const { data, error } = await supabase.functions.invoke(
          "accept-calendar-share",
          { body: { token } },
        );

        if (error) {
          setStatus("error");
          setErrorMsg("Could not accept this invite. Please try again.");
          return;
        }

        if (data?.ok === false) {
          setStatus("error");
          setErrorMsg(data.error || "This invite could not be accepted.");
          return;
        }

        setStatus("success");
      } catch {
        setStatus("error");
        setErrorMsg("Something went wrong. Please try again.");
      }
    };

    void accept();
  }, [token, isLoggedIn]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {/* Loading */}
        {status === "loading" && (
          <div className="space-y-3">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-foreground" />
            <p className="text-sm text-muted-foreground">
              Accepting invite...
            </p>
          </div>
        )}

        {/* Success */}
        {status === "success" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
              <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Calendar shared!
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                You can now see their activities on your calendar.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button asChild>
                <Link href="/activities">View my calendar</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/friends">Go to friends</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Invite could not be accepted
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {errorMsg}
              </p>
            </div>
            <Button variant="outline" asChild className="mt-2">
              <Link href="/">Go home</Link>
            </Button>
          </div>
        )}

        {/* No token */}
        {status === "no-token" && (
          <div className="space-y-4">
            <div className="text-3xl">🔗</div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Invalid invite link
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                This link is missing the invite token. Please check the link and
                try again.
              </p>
            </div>
            <Button variant="outline" asChild className="mt-2">
              <Link href="/">Go home</Link>
            </Button>
          </div>
        )}

        {/* Needs login */}
        {status === "needs-login" && (
          <div className="space-y-4">
            <div className="text-3xl">📅</div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Sign in to accept this invite
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Someone shared their calendar with you. Sign in or create an
                account to view their activities.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={() => setLoginOpen(true)}>Sign in</Button>
              <Button variant="outline" onClick={() => setSignupOpen(true)}>
                Create an account
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Auth modals */}
      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchToSignup={() => setSignupOpen(true)}
      />
      <SignUpModal
        isOpen={signupOpen}
        onClose={() => setSignupOpen(false)}
        onSwitchToLogin={() => setLoginOpen(true)}
      />
    </main>
  );
}

/* ── page export (Suspense wrapper for useSearchParams) ── */

export default function SharedCalendarPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        </main>
      }
    >
      <AcceptShareInner />
    </Suspense>
  );
}
