import React, { useState } from "react";
import { Container } from "./Container";
import { supabase } from "../../lib/supabase";

type Status = "idle" | "success" | "error" | "duplicate";

export const Footer: React.FC = () => {
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

    // Normalize zip: digits only, first 5, or null
    const normalizedZipRaw = zip.replace(/\D/g, "").slice(0, 5);
    const normalizedZip = normalizedZipRaw.length === 5 ? normalizedZipRaw : null;

    const trimmedEmail = email.trim();

    try {
      const { error } = await supabase.from("newsletter_signups").insert({
        email: trimmedEmail,
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
    } catch (err) {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="border-t border-wowzie-borderSubtle bg-wowzie-surface mt-16">
      <Container className="py-12">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          {/* LEFT SIDE — LOGO + LINKS */}
          <div className="flex gap-10">
            {/* Logo */}
            <a
              href="/"
              className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-wowzie-accent text-sm font-semibold text-white"
            >
              W
              <span className="sr-only">Wowzie</span>
            </a>

            {/* Link columns */}
            <div className="flex gap-12 text-sm text-wowzie-text-subtle">
              <div className="space-y-3">
                <h3 className="font-medium text-wowzie-text">Support</h3>
                <ul className="space-y-2">
                  <li>
                    <a href="/search" className="hover:text-wowzie-text-primary">
                      Find an activity
                    </a>
                  </li>
                  <li>
                    <a href="/host" className="hover:text-wowzie-text-primary">
                      List an activity
                    </a>
                  </li>
                  <li>
                    <a href="/privacy" className="hover:text-wowzie-text-primary">
                      Privacy policy
                    </a>
                  </li>
                  <li>
                    <a href="/terms" className="hover:text-wowzie-text-primary">
                      Terms and Conditions
                    </a>
                  </li>
                  <li>
                    <a
                      href="/data-transparency"
                      className="hover:text-wowzie-text-primary"
                    >
                      Data transparency
                    </a>
                  </li>
                  <li>
                    <a href="/help" className="hover:text-wowzie-text-primary">
                      Help center
                    </a>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium text-wowzie-text">Connect</h3>
                <ul className="space-y-2">
                  <li>
                    <a href="/contact" className="hover:text-wowzie-text-primary">
                      Contact
                    </a>
                  </li>
                  <li>
                    <a href="/follow" className="hover:text-wowzie-text-primary">
                      Follow
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE — NEWSLETTER */}
          <div className="w-full max-w-xl space-y-4 text-sm">
            <div className="space-y-1">
              <h3 className="text-base font-medium text-wowzie-text">
                Stay in the loop
              </h3>
              <p className="text-wowzie-text-subtle">
                Sign up to hear about new camps, classes, and activities near you.
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
                  className="flex-1 rounded-md border border-wowzie-borderSubtle bg-white px-3 py-2 text-sm placeholder:text-wowzie-text-subtle focus:outline-none focus:ring-2 focus:ring-wowzie-accent"
                />

                <input
                  type="text"
                  placeholder="Zip code"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className="sm:w-40 rounded-md border border-wowzie-borderSubtle bg-white px-3 py-2 text-sm placeholder:text-wowzie-text-subtle focus:outline-none focus:ring-2 focus:ring-wowzie-accent"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-md bg-wowzie-text-primary px-4 py-2 text-sm font-medium text-white hover:bg-wowzie-text-primary/90 disabled:opacity-60"
              >
                {submitting ? "Joining…" : "Join the newsletter"}
              </button>

              <div aria-live="polite" className="min-h-[1rem] mt-1">
                {status === "success" && (
                  <p className="text-xs text-green-600">You&apos;re signed up!</p>
                )}
                {status === "duplicate" && (
                  <p className="text-xs text-wowzie-text-subtle">
                    You&apos;re already signed up with that email. 🎉
                  </p>
                )}
                {status === "error" && (
                  <p className="text-xs text-red-600">
                    Something went wrong. Please try again.
                  </p>
                )}
              </div>
            </form>

            <p className="max-w-md text-xs leading-relaxed text-wowzie-text-subtle">
              By joining, you’ll get the latest on kids’ camps and classes in your
              area. See our{" "}
              <a
                href="/privacy"
                className="underline hover:text-wowzie-text-primary"
              >
                privacy policy
              </a>{" "}
              for details.
            </p>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="mt-10 flex flex-col gap-3 border-t border-wowzie-borderSubtle pt-4 text-xs text-wowzie-text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Wowzie. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-3">
            <a href="/privacy" className="hover:text-wowzie-text-primary">
              Privacy
            </a>
            <a href="/terms" className="hover:text-wowzie-text-primary">
              Terms
            </a>
            <a href="/cookies" className="hover:text-wowzie-text-primary">
              Cookies
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
};
