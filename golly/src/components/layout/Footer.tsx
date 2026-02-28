"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Status = "idle" | "success" | "error" | "duplicate";

export function Footer() {
  const year = new Date().getFullYear();

  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [submitting, setSubmitting] = useState(false);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setStatus("idle");

    const normalizedZipRaw = zip.replace(/\D/g, "").slice(0, 5);
    const normalizedZip =
      normalizedZipRaw.length === 5 ? normalizedZipRaw : null;

    try {
      const { error } = await supabase.from("newsletter_signups").insert({
        email: email.trim(),
        zip_code: normalizedZip,
      });

      if (error) {
        if (error.code === "23505") {
          setStatus("duplicate");
          return;
        }
        setStatus("error");
        return;
      }

      setStatus("success");
      setEmail("");
      setZip("");
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 py-12">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: Logo + Links */}
          <div className="flex flex-col gap-6 sm:flex-row sm:gap-10">
            <Link href="/" className="inline-flex items-center" aria-label="Go to homepage">
              <span className="font-bold tracking-tight font-logo leading-none text-brand" style={{ fontSize: "40px" }}>
                golly
              </span>
            </Link>

            <div className="grid grid-cols-2 gap-12 text-sm text-muted-foreground">
              <div className="space-y-3">
                <h3 className="font-medium text-foreground">Support</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/search" className="hover:text-primary">
                      Find an activity
                    </Link>
                  </li>
                  <li>
                    <Link href="/host" className="hover:text-primary">
                      List an activity
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacy" className="hover:text-primary">
                      Privacy policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="hover:text-primary">
                      Terms and Conditions
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium text-foreground">Connect</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/contact" className="hover:text-primary">
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right: Newsletter */}
          <div className="w-full max-w-xl space-y-4 text-sm">
            <div className="space-y-1">
              <h3 className="text-base font-medium text-foreground">
                Stay in the loop
              </h3>
              <p className="text-muted-foreground">
                Sign up to hear about new camps, classes, and activities near
                you.
              </p>
            </div>

            <form onSubmit={handleSignup} className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground hover:bg-gray-50 focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-colors"
                />
                <input
                  type="text"
                  placeholder="Zip code"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className="sm:w-40 rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground hover:bg-gray-50 focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting ? "Joining\u2026" : "Join the newsletter"}
              </button>

              <div aria-live="polite" className="min-h-[1rem] mt-1">
                {status === "success" && (
                  <p className="text-xs text-emerald-600">
                    You&apos;re signed up!
                  </p>
                )}
                {status === "duplicate" && (
                  <p className="text-xs text-muted-foreground">
                    You&apos;re already signed up with that email.
                  </p>
                )}
                {status === "error" && (
                  <p className="text-xs text-destructive">
                    Something went wrong. Please try again.
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-4 text-xs text-muted-foreground">
          <p>&copy; {year} Golly. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
