"use client";

import { useEffect, useMemo, useState, Suspense, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Camp } from "@/components/CampCard";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type CampSession = {
  id: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  capacity?: number | null;
};

type CampDetail = Camp & {
  hero_image_url?: string | null;
  host_id?: string | null;
  meta?: {
    campSessions?: CampSession[];
    pricing?: { display?: string };
    [key: string]: unknown;
  } | null;
  location?: string | null;
};

function formatDateShort(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const isUuid = (value: string | undefined | null): boolean => {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
};

const formatMoney = (cents: number | null | undefined) => {
  const n = Number(cents || 0);
  return `$${(n / 100).toFixed(2)}`;
};

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-muted-foreground">Loading…</div>}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const { campId } = useParams<{ campId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const guestsParam = Math.max(1, Math.min(10, Number(searchParams.get("guests") || "1") || 1));
  const sessionIdsParam = (searchParams.get("sessions") || "").split(",").filter(Boolean);

  const [camp, setCamp] = useState<CampDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guests, setGuests] = useState(guestsParam);

  const selectedSessions = useMemo<CampSession[]>(() => {
    if (!camp?.meta?.campSessions || sessionIdsParam.length === 0) return [];
    return camp.meta.campSessions.filter((s) => sessionIdsParam.includes(s.id));
  }, [camp, sessionIdsParam]); // eslint-disable-line react-hooks/exhaustive-deps

  const sessionCount = Math.max(selectedSessions.length, 1);
  const totalCents = (camp?.price_cents ?? 0) * sessionCount * guests;

  const [email, setEmail] = useState("");
  const [messageToHost, setMessageToHost] = useState(
    "Hi there, we\u2019re excited to join. Anything we should know before we arrive?"
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Embedded checkout state
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  useEffect(() => {
    const load = async () => {
      if (!campId) { setError("No camp specified."); setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        const select = "id, slug, name, description, location, image_url, hero_image_url, price_cents, meta, host_id";
        const byId = isUuid(campId);
        const query = supabase.from("camps").select(select);
        const { data, error: campError } = byId
          ? await query.eq("id", campId).maybeSingle()
          : await query.eq("slug", campId).maybeSingle();
        if (campError) throw campError;
        if (!data) throw new Error("Camp not found.");
        setCamp(data as CampDetail);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Could not load camp.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [campId]);

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (!email.trim()) return false;
    if (!user) return false;
    return true;
  }, [submitting, email, user]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user || !camp) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campId: camp.id,
          campName: camp.name,
          priceCents: camp.price_cents ?? 0,
          guests,
          sessionCount,
          sessionIds: selectedSessions.map((s) => s.id),
          email: email.trim(),
          userId: user.id,
          messageToHost: messageToHost.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        if (res.status === 409) { router.push(`/camp/${campId}?full=1`); return; }
        throw new Error(json.error || "Could not start checkout.");
      }

      // Show embedded checkout
      setClientSecret(json.clientSecret);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Could not start checkout.");
      setSubmitting(false);
    }
  };

  // fetchClientSecret for EmbeddedCheckoutProvider — returns the already-fetched secret
  const fetchClientSecret = useCallback(() => {
    return Promise.resolve(clientSecret!);
  }, [clientSecret]);

  if (loading) return <div className="py-10 text-center text-muted-foreground">Loading…</div>;
  if (error || !camp) return <div className="py-10 text-center text-destructive">{error || "Camp not found"}</div>;

  const heroImage = camp.hero_image_url || camp.image_url || "https://placehold.co/1200";

  return (
    <main>
      <div className="page-container py-8 lg:py-10">
        <div className="page-grid">
          <div className="span-10-center">
            <div className="mb-6">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Checkout</p>
              <h1 className="text-xl font-semibold text-foreground">Confirm your booking</h1>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                {!user ? (
                  <div className="rounded-card bg-card p-5">
                    <p className="text-sm text-muted-foreground">Please sign in to continue.</p>
                  </div>
                ) : clientSecret ? (
                  /* ── Embedded Stripe checkout ── */
                  <div className="rounded-card bg-card overflow-hidden">
                    <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
                      <EmbeddedCheckout />
                    </EmbeddedCheckoutProvider>
                  </div>
                ) : (
                  /* ── Pre-payment form ── */
                  <form onSubmit={onSubmit} className="space-y-5">
                    {/* Contact */}
                    <section className="rounded-card bg-card p-5 space-y-4">
                      <div>
                        <h2 className="text-sm font-semibold">Contact</h2>
                        <p className="text-xs text-muted-foreground">We&apos;ll send booking details here.</p>
                      </div>
                      <label className="block space-y-1">
                        <span className="text-xs font-medium">Email</span>
                        <input
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="block w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground outline-none hover:bg-gray-50 focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-colors"
                          inputMode="email"
                          autoComplete="email"
                          required
                        />
                      </label>
                    </section>

                    {/* Message */}
                    <section className="rounded-card bg-card p-5 space-y-4">
                      <div>
                        <h2 className="text-sm font-semibold">Message the host</h2>
                        <p className="text-xs text-muted-foreground">Share who&apos;s coming and anything helpful.</p>
                      </div>
                      <textarea
                        value={messageToHost}
                        onChange={(e) => setMessageToHost(e.target.value)}
                        rows={4}
                        className="block w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground outline-none hover:bg-gray-50 focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 resize-none transition-colors"
                      />
                    </section>

                    {submitError && (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                        {submitError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-60 hover:bg-foreground/90 transition-colors"
                    >
                      {submitting ? (
                        "Loading payment…"
                      ) : (
                        <>
                          <span className="material-symbols-rounded select-none" style={{ fontSize: 14 }} aria-hidden>lock</span>
                          {`Continue to payment — ${formatMoney(totalCents)}`}
                        </>
                      )}
                    </button>

                    <p className="text-center text-xs text-muted-foreground">
                      You won&apos;t be charged until you complete payment on the next step.
                    </p>
                  </form>
                )}
              </div>

              {/* Sidebar */}
              <aside className="space-y-4">
                <div className="rounded-card bg-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 overflow-hidden rounded-xl bg-muted shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={heroImage} alt={camp.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Camp</p>
                      <p className="text-sm font-semibold truncate">{camp.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{camp.location || ""}</p>
                    </div>
                  </div>

                  <dl className="mt-4 space-y-2 text-xs">
                    {selectedSessions.length > 0 && (
                      <div className="space-y-1 pb-2 border-b border-border">
                        <dt className="text-muted-foreground font-medium">Sessions</dt>
                        {selectedSessions.map((s) => (
                          <dd key={s.id} className="flex justify-between text-foreground">
                            <span>Session {(camp.meta?.campSessions ?? []).findIndex((c) => c.id === s.id) + 1}</span>
                            <span className="text-muted-foreground">{formatDateShort(s.startDate)} – {formatDateShort(s.endDate)}</span>
                          </dd>
                        ))}
                      </div>
                    )}

                    {!clientSecret && (
                      <div className="flex justify-between items-center">
                        <dt className="text-muted-foreground">Campers</dt>
                        <dd>
                          <select
                            value={guests}
                            onChange={(e) => setGuests(Number(e.target.value))}
                            className="rounded-lg border border-input bg-transparent px-2 py-1 text-xs outline-none"
                          >
                            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>{n} child{n !== 1 ? "ren" : ""}</option>
                            ))}
                          </select>
                        </dd>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        {formatMoney(camp.price_cents)}
                        {sessionCount > 1 && ` × ${sessionCount} sessions`}
                        {guests > 1 && ` × ${guests} campers`}
                      </dt>
                      <dd>{formatMoney(totalCents)}</dd>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 font-semibold">
                      <dt>Total</dt>
                      <dd>{formatMoney(totalCents)}</dd>
                    </div>
                  </dl>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="material-symbols-rounded select-none" style={{ fontSize: 12 }} aria-hidden>lock</span>
                  Secured by Stripe
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
