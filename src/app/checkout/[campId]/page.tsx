"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from "@stripe/react-stripe-js";
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

type TimeSlot = {
  key: string;      // "mon-09:00-10:00"
  dayKey: string;   // "mon"
  dayLabel: string; // "Monday"
  start: string;    // "09:00"
  end: string;      // "10:00"
  label: string;    // "Monday · 9:00AM – 10:00AM"
};

const DAY_FULL: Record<string, string> = {
  sun: "Sunday", mon: "Monday", tue: "Tuesday", wed: "Wednesday",
  thu: "Thursday", fri: "Friday", sat: "Saturday",
};
const DAY_ORDER = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function fmt12(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr ?? "0", 10);
  const m = parseInt(mStr ?? "0", 10);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

function extractTimeSlots(meta: any): TimeSlot[] {
  const weekly: Record<string, any> =
    meta?.classSchedule?.weekly ?? meta?.weeklySchedule ?? {};
  const slots: TimeSlot[] = [];
  for (const dayKey of DAY_ORDER) {
    const val = weekly[dayKey];
    if (!val) continue;
    // New shape: { available, blocks: [{ start, end }] }
    if (val.available !== false && Array.isArray(val.blocks)) {
      for (const b of val.blocks) {
        if (!b.start || !b.end) continue;
        slots.push({
          key: `${dayKey}-${b.start}-${b.end}`,
          dayKey, dayLabel: DAY_FULL[dayKey] ?? dayKey,
          start: b.start, end: b.end,
          label: `${DAY_FULL[dayKey] ?? dayKey} · ${fmt12(b.start)} – ${fmt12(b.end)}`,
        });
      }
    } else if (typeof val.start === "string" && typeof val.end === "string") {
      // Legacy flat shape: { start, end }
      slots.push({
        key: `${dayKey}-${val.start}-${val.end}`,
        dayKey, dayLabel: DAY_FULL[dayKey] ?? dayKey,
        start: val.start, end: val.end,
        label: `${DAY_FULL[dayKey] ?? dayKey} · ${fmt12(val.start)} – ${fmt12(val.end)}`,
      });
    }
  }
  return slots;
}

const isUuid = (v: string | undefined | null) =>
  !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const formatMoney = (cents: number | null | undefined) =>
  `$${(Number(cents || 0) / 100).toFixed(2)}`;

function formatDateShort(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ── Inner payment form (needs stripe/elements context) ── */
function PaymentForm({
  camp, guests, setGuests, selectedSessions, sessionCount, totalCents, breakdown, bookingId, clientSecret, email, setEmail, messageToHost, setMessageToHost, preferredSlot,
}: {
  camp: CampDetail; guests: number; setGuests: (n: number) => void;
  selectedSessions: CampSession[]; sessionCount: number; totalCents: number;
  breakdown: Array<{ label: string; cents: number; note?: string }>;
  bookingId: string; clientSecret: string; email: string; setEmail: (s: string) => void;
  messageToHost: string; setMessageToHost: (s: string) => void;
  preferredSlot: TimeSlot | null;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://heywowzi.com";

  // Stripe element appearance matching the site's input style
  const cardStyle = {
    style: {
      base: {
        fontSize: "14px",
        fontFamily: "inherit",
        color: "#18181b",
        "::placeholder": { color: "#a1a1aa" },
      },
      invalid: { color: "#ef4444" },
    },
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) { setSubmitting(false); return; }

    // Create payment method then confirm
    const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
      type: "card",
      card: cardNumber,
      billing_details: { email },
    });

    if (pmError) {
      setSubmitError(pmError.message ?? "Card error. Please try again.");
      setSubmitting(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: paymentMethod.id,
      receipt_email: email,
    });

    if (confirmError) {
      setSubmitError(confirmError.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
    } else {
      // Redirect to confirmation
      window.location.href = `${origin}/checkout/confirmed/${bookingId}?stripe=1`;
    }
  };

  const heroImage = camp.hero_image_url || camp.image_url || "https://placehold.co/1200";

  return (
    <form onSubmit={onSubmit}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">

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
                inputMode="email" autoComplete="email" required
              />
            </label>
          </section>

          {/* Payment */}
          <section className="rounded-card bg-card p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold">Payment</h2>
              <p className="text-xs text-muted-foreground">Your card details are encrypted and never stored on our servers.</p>
            </div>
            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium">Card number</span>
                <div className="rounded-xl border border-input bg-transparent px-3 py-2.5">
                  <CardNumberElement options={cardStyle} />
                </div>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium">Expiration</span>
                  <div className="rounded-xl border border-input bg-transparent px-3 py-2.5">
                    <CardExpiryElement options={cardStyle} />
                  </div>
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium">CVC</span>
                  <div className="rounded-xl border border-input bg-transparent px-3 py-2.5">
                    <CardCvcElement options={cardStyle} />
                  </div>
                </label>
              </div>
            </div>
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
            disabled={!stripe || !elements || submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-60 hover:bg-foreground/90 transition-colors"
          >
            <span className="material-symbols-rounded select-none" style={{ fontSize: 14 }} aria-hidden>lock</span>
            {submitting ? "Processing…" : `Reserve — ${formatMoney(totalCents)}`}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            By reserving you agree to our terms. Your card will be charged immediately.
          </p>
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
              {preferredSlot && (
                <div className="pb-2 border-b border-border">
                  <dt className="text-muted-foreground font-medium mb-1">Class time</dt>
                  <dd className="text-foreground">{preferredSlot.label}</dd>
                </div>
              )}
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

              {breakdown.length > 0 ? (
                breakdown.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <dt className={item.cents < 0 ? "text-green-700" : "text-muted-foreground"}>
                      {item.label}{item.note ? ` (${item.note})` : ""}
                    </dt>
                    <dd className={item.cents < 0 ? "text-green-700" : ""}>{item.cents < 0 ? `-${formatMoney(Math.abs(item.cents))}` : formatMoney(item.cents)}</dd>
                  </div>
                ))
              ) : (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    {formatMoney(camp.price_cents)}
                    {sessionCount > 1 && ` × ${sessionCount} sessions`}
                    {guests > 1 && ` × ${guests} campers`}
                  </dt>
                  <dd>{formatMoney(totalCents)}</dd>
                </div>
              )}
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
    </form>
  );
}

/* ── Page shell ── */
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
  const slotParam = searchParams.get("slot") ?? null; // pre-selected from detail page

  const [camp, setCamp] = useState<CampDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guests, setGuests] = useState(guestsParam);
  const [email, setEmail] = useState("");
  const [messageToHost, setMessageToHost] = useState(
    "Hi there, we\u2019re excited to join. Anything we should know before we arrive?"
  );

  // Time slot selection (ongoing classes)
  const [preferredSlot, setPreferredSlot] = useState<TimeSlot | null>(null);

  // Payment Intent state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [serverTotalCents, setServerTotalCents] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<Array<{ label: string; cents: number; note?: string }>>([]);
  const [piError, setPiError] = useState<string | null>(null);
  const [piLoading, setPiLoading] = useState(false);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  useEffect(() => {
    const load = async () => {
      if (!campId) { setError("No camp specified."); setLoading(false); return; }
      setLoading(true);
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

  const selectedSessions = useMemo<CampSession[]>(() => {
    if (!camp?.meta?.campSessions || sessionIdsParam.length === 0) return [];
    return camp.meta.campSessions.filter((s) => sessionIdsParam.includes(s.id));
  }, [camp, sessionIdsParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive available time slots for ongoing classes
  const timeSlots = useMemo<TimeSlot[]>(() => {
    if (!camp?.meta) return [];
    const isOngoing = (camp.meta as any)?.classSchedule?.mode === "ongoing"
      || ((camp.meta as any)?.activityKind === "class" && (
        (camp.meta as any)?.classSchedule?.weekly || (camp.meta as any)?.weeklySchedule
      ));
    if (!isOngoing) return [];
    return extractTimeSlots(camp.meta);
  }, [camp]);

  // If slot was pre-selected on the detail page, apply it once slots are known
  useEffect(() => {
    if (!slotParam || !timeSlots.length || preferredSlot) return;
    const match = timeSlots.find((s) => s.key === slotParam);
    if (match) setPreferredSlot(match);
  }, [slotParam, timeSlots]); // eslint-disable-line react-hooks/exhaustive-deps

  const sessionCount = Math.max(selectedSessions.length, 1);
  // Use server-computed total once PI is created; fall back to naive estimate while loading
  const totalCents = serverTotalCents ?? (camp?.price_cents ?? 0) * sessionCount * guests;

  // Create PaymentIntent once camp + user + slot (if needed) are ready
  useEffect(() => {
    if (!camp || !user || !email || piLoading || clientSecret) return;
    // If this is an ongoing class with slots, wait until one is selected
    if (timeSlots.length > 0 && !preferredSlot) return;
    const create = async () => {
      setPiLoading(true);
      setPiError(null);
      try {
        const res = await fetch("/api/stripe/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campId: camp.id, campName: camp.name,
            priceCents: camp.price_cents ?? 0,
            guests, sessionCount,
            sessionIds: selectedSessions.map((s) => s.id),
            email: email.trim(), userId: user.id,
            messageToHost: messageToHost.trim() || null,
            preferredSlot: preferredSlot
              ? { day: preferredSlot.dayKey, start: preferredSlot.start, end: preferredSlot.end, label: preferredSlot.label }
              : null,
          }),
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          if (res.status === 409) { router.push(`/camp/${campId}?full=1`); return; }
          throw new Error(json.error || "Could not start checkout.");
        }
        setClientSecret(json.clientSecret);
        setBookingId(json.bookingId);
        if (json.totalCents != null) setServerTotalCents(json.totalCents);
        if (Array.isArray(json.breakdown)) setBreakdown(json.breakdown);
      } catch (err: unknown) {
        setPiError(err instanceof Error ? err.message : "Could not start checkout.");
      } finally {
        setPiLoading(false);
      }
    };
    void create();
  }, [camp, user, email, preferredSlot]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="py-10 text-center text-muted-foreground">Loading…</div>;
  if (error || !camp) return <div className="py-10 text-center text-destructive">{error || "Camp not found"}</div>;

  return (
    <main>
      <div className="page-container py-8 lg:py-10">
        <div className="page-grid">
          <div className="span-10-center">
            <div className="mb-6">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Checkout</p>
              <h1 className="text-xl font-semibold text-foreground">Confirm your booking</h1>
            </div>

            {!user ? (
              <div className="rounded-card bg-card p-5">
                <p className="text-sm text-muted-foreground">Please sign in to continue.</p>
              </div>
            ) : piError ? (
              <div className="rounded-card bg-card p-5">
                <p className="text-sm text-destructive">{piError}</p>
              </div>
            ) : timeSlots.length > 0 && !preferredSlot ? (
              /* Step 1: Choose a time slot */
              <div className="max-w-lg">
                <div className="rounded-card bg-card p-5 space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold">Choose your class time</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Pick the weekly slot that works best for you.</p>
                  </div>
                  <div className="space-y-2">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot.key}
                        type="button"
                        onClick={() => setPreferredSlot(slot)}
                        className="w-full flex items-center justify-between rounded-xl border border-input px-4 py-3 text-sm text-left hover:bg-muted/50 hover:border-foreground/30 transition-colors"
                      >
                        <span className="font-medium">{slot.label}</span>
                        <svg className="h-4 w-4 text-muted-foreground/50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : !clientSecret ? (
              /* Loading skeleton while PaymentIntent is being created */
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-5">
                  {[120, 180, 140].map((h, i) => (
                    <div key={i} className="rounded-card bg-card p-5">
                      <div className="h-4 w-32 rounded bg-muted animate-pulse mb-4" />
                      <div className={`rounded-xl bg-muted animate-pulse`} style={{ height: h }} />
                    </div>
                  ))}
                </div>
                <div className="rounded-card bg-card p-5 h-48 animate-pulse" />
              </div>
            ) : (
              <Elements stripe={stripePromise}>
                <PaymentForm
                  camp={camp}
                  guests={guests}
                  setGuests={setGuests}
                  selectedSessions={selectedSessions}
                  sessionCount={sessionCount}
                  totalCents={totalCents}
                  breakdown={breakdown}
                  bookingId={bookingId!}
                  clientSecret={clientSecret}
                  email={email}
                  setEmail={setEmail}
                  messageToHost={messageToHost}
                  setMessageToHost={setMessageToHost}
                  preferredSlot={preferredSlot}
                />
              </Elements>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
