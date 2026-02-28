"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Camp } from "@/components/CampCard";

type CampDetail = Camp & {
  hero_image_url?: string | null;
  host_id?: string | null;
  meta?: Record<string, unknown> | null;
  location?: string | null;
};

const isUuid = (value: string | undefined | null): boolean => {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
};

const formatMoney = (cents: number | null | undefined) => {
  const n = Number(cents || 0);
  return `$${(n / 100).toFixed(2)}`;
};

export default function CheckoutPage() {
  const { campId } = useParams<{ campId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [camp, setCamp] = useState<CampDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [messageToHost, setMessageToHost] = useState(
    "Hi there, we\u2019re excited to join. Anything we should know before we arrive?",
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  useEffect(() => {
    const load = async () => {
      if (!campId) {
        setError("No camp specified.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const select =
          "id, slug, name, description, location, image_url, hero_image_url, price_cents, meta, host_id";
        const byId = isUuid(campId);
        const query = supabase.from("camps").select(select);

        const { data, error: campError } = byId
          ? await query.eq("id", campId).maybeSingle()
          : await query.eq("slug", campId).maybeSingle();

        if (campError) throw campError;
        if (!data) throw new Error("Camp not found.");

        setCamp(data as CampDetail);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Could not load camp.";
        setError(message);
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
      const totalCents = Number.isInteger(camp.price_cents)
        ? (camp.price_cents as number)
        : 0;

      const { data, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          camp_id: camp.id,
          status: "confirmed",
          guests_count: 1,
          total_cents: totalCents,
          currency: "usd",
          contact_email: email.trim() || null,
          message_to_host: messageToHost.trim() || null,
          payment_status: "mock_confirmed",
        })
        .select("id")
        .single();

      if (bookingError) throw bookingError;

      router.push(`/checkout/confirmed/${data?.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not save booking.";
      setSubmitError(message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Loading&hellip;
      </div>
    );
  }

  if (error || !camp) {
    return (
      <div className="py-10 text-center text-destructive">
        {error || "Camp not found"}
      </div>
    );
  }

  const heroImage =
    camp.hero_image_url || camp.image_url || "https://placehold.co/1200";

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Checkout
        </p>
        <h1 className="text-xl font-semibold text-foreground">
          Confirm your booking
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {!user ? (
            <div className="rounded-2xl bg-card p-5">
              <p className="text-sm text-muted-foreground">
                Please sign in to continue.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              {/* Contact */}
              <section className="rounded-2xl bg-card p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold">Contact</h2>
                  <p className="text-xs text-muted-foreground">
                    We&apos;ll send booking details here.
                  </p>
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

              {/* Payment (mock) */}
              <section className="rounded-2xl bg-card p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold">Payment</h2>
                  <p className="text-xs text-muted-foreground">
                    Mock mode is on. No real payment is processed.
                  </p>
                </div>
                <div className="rounded-xl border border-dashed border-border bg-muted/50 px-3 py-6 text-xs text-muted-foreground text-center">
                  Payment fields are disabled in mock mode
                </div>
              </section>

              {/* Message */}
              <section className="rounded-2xl bg-card p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold">Message the host</h2>
                  <p className="text-xs text-muted-foreground">
                    Share who&apos;s coming and anything helpful.
                  </p>
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
                className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60 hover:bg-primary/90"
              >
                {submitting
                  ? "Processing\u2026"
                  : `Reserve ${formatMoney(camp.price_cents)}`}
              </button>
            </form>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-2xl bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 overflow-hidden rounded-xl bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroImage}
                  alt={camp.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Camp</p>
                <p className="text-sm font-semibold truncate">{camp.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {camp.location || ""}
                </p>
              </div>
            </div>

            <dl className="mt-4 space-y-1 text-xs">
              <div className="flex justify-between">
                <dt>Guests</dt>
                <dd>1 child</dd>
              </div>
              <div className="flex justify-between">
                <dt>Price</dt>
                <dd>{formatMoney(camp.price_cents)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold">
                <dt>Total</dt>
                <dd>{formatMoney(camp.price_cents)}</dd>
              </div>
            </dl>

            <p className="mt-3 text-[11px] text-muted-foreground">
              Mock mode is on. No real payment is processed.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
