// src/pages/CheckoutPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";
import type { Camp } from "../components/CampCard";

import { SectionHeader } from "../components/layout/SectionHeader";
import { Textarea } from "../components/ui/Textarea";

import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

type CampDetail = Camp & {
  hero_image_url?: string | null;
  host_id?: string | null;
  meta?: any | null;

  // Fix: Camp type in your project does not guarantee location exists,
  // but this page uses it and your query selects it.
  location?: string | null;
};

const STRIPE_MODE =
  (import.meta.env.VITE_STRIPE_MODE as string | undefined) || "mock"; // "mock" | "live"
const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  "http://localhost:4242";
const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as
  | string
  | undefined;

const stripePromise =
  STRIPE_MODE === "live"
    ? (() => {
        if (!PUBLISHABLE_KEY)
          throw new Error("Missing VITE_STRIPE_PUBLISHABLE_KEY.");
        return loadStripe(PUBLISHABLE_KEY);
      })()
    : null;

const isUuid = (value: string | undefined | null): boolean => {
  if (!value) return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

const formatMoney = (cents: number | null | undefined) => {
  const n = Number(cents || 0);
  return `$${(n / 100).toFixed(2)}`;
};

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || `HTTP ${res.status}` };
  }

  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
  return data as T;
}

async function insertBooking(args: {
  user: User;
  camp: CampDetail;
  contactEmail: string | null;
  messageToHost: string;
  paymentStatus: string;
}) {
  const totalCents = Number.isInteger(args.camp.price_cents)
    ? (args.camp.price_cents as number)
    : 0;

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      user_id: args.user.id,
      camp_id: args.camp.id,
      status: "confirmed",
      guests_count: 1,
      total_cents: totalCents,
      currency: "usd",
      contact_email: args.contactEmail,
      message_to_host: args.messageToHost || null,
      payment_status: args.paymentStatus,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data?.id as string;
}

function Card(props: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={[
        "rounded-2xl border border-black/10 bg-white p-5 shadow-sm",
        props.className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {props.children}
    </section>
  );
}

const CardHeader: React.FC<{ title: string; subtitle?: string }> = ({
  title,
  subtitle,
}) => {
  return (
    <div className="space-y-1">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : null}
    </div>
  );
};

function LiveCheckoutForm(props: { user: User; camp: CampDetail }) {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();

  const defaultEmail =
    props.user.email ||
    (props.user.user_metadata?.email as string | undefined) ||
    "";
  const [email, setEmail] = useState(defaultEmail);
  const [messageToHost, setMessageToHost] = useState(
    "Hi there, we’re excited to join. Anything we should know before we arrive?",
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (!stripe || !elements) return false;
    if (!email.trim()) return false;
    return true;
  }, [submitting, stripe, elements, email]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/complete`,
          receipt_email: email.trim() || undefined,
        },
        redirect: "if_required",
      });

      if (result.error) {
        setError(result.error.message || "We couldn’t process your payment.");
        setSubmitting(false);
        return;
      }

      const status = result.paymentIntent?.status || "unknown";

      const bookingId = await insertBooking({
        user: props.user,
        camp: props.camp,
        contactEmail: email.trim() || null,
        messageToHost: messageToHost.trim(),
        paymentStatus: status,
      });

      navigate(`/checkout/confirmed/${bookingId}`);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message || "Payment succeeded, but booking could not be saved.",
      );
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Card className="space-y-4">
        <CardHeader title="contact" subtitle="We’ll send booking details here." />

        <label className="block space-y-1">
          <span className="text-xs font-medium text-gray-900">email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={[
              "block w-full rounded-xl border bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm",
              "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500",
              "border-black/10",
            ].join(" ")}
            inputMode="email"
            autoComplete="email"
            required
          />
        </label>
      </Card>

      <Card className="space-y-4">
        <CardHeader
          title="payment"
          subtitle="Billing details may be requested based on your payment method."
        />

        <div className="rounded-xl border border-black/10 bg-gray-50 px-3 py-3">
          <PaymentElement options={{ layout: "tabs" }} />
        </div>

        <p className="text-[11px] text-gray-500">
          Your payment information is encrypted and never stored on Wowzie.
        </p>
      </Card>

      <Card className="space-y-4">
        <CardHeader
          title="message the host"
          subtitle="Share who’s coming and anything helpful to know."
        />

        <Textarea
          value={messageToHost}
          onChange={(e) => setMessageToHost(e.target.value)}
          rows={6}
          placeholder="Hi there..."
        />

        <p className="text-[11px] text-gray-500">
          Keep it short and friendly. No need to share phone numbers or addresses.
        </p>
      </Card>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="inline-flex w-full items-center justify-center rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting
          ? "processing..."
          : `reserve ${formatMoney(props.camp.price_cents)}`}
      </button>
    </form>
  );
}

function MockCheckoutForm(props: { user: User; camp: CampDetail }) {
  const navigate = useNavigate();

  const defaultEmail =
    props.user.email ||
    (props.user.user_metadata?.email as string | undefined) ||
    "";
  const [email, setEmail] = useState(defaultEmail);
  const [messageToHost, setMessageToHost] = useState(
    "Hi there, we’re excited to join. Anything we should know before we arrive?",
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (!email.trim()) return false;
    return true;
  }, [submitting, email]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const bookingId = await insertBooking({
        user: props.user,
        camp: props.camp,
        contactEmail: email.trim() || null,
        messageToHost: messageToHost.trim(),
        paymentStatus: "mock_confirmed",
      });

      navigate(`/checkout/confirmed/${bookingId}`);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Could not save booking.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Card className="space-y-4">
        <CardHeader title="contact" subtitle="We’ll send booking details here." />
        <label className="block space-y-1">
          <span className="text-xs font-medium text-gray-900">email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={[
              "block w-full rounded-xl border bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm",
              "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500",
              "border-black/10",
            ].join(" ")}
            required
          />
        </label>
      </Card>

      <Card className="space-y-4">
        <CardHeader
          title="payment"
          subtitle="Mock mode is on. No real payment is processed."
        />
        <div className="rounded-xl border border-dashed border-black/10 bg-gray-50 px-3 py-6 text-xs text-gray-500 text-center">
          payment fields are disabled in mock mode
        </div>
      </Card>

      <Card className="space-y-4">
        <CardHeader
          title="message the host"
          subtitle="Share who’s coming and anything helpful to know."
        />
        <Textarea
          value={messageToHost}
          onChange={(e) => setMessageToHost(e.target.value)}
          rows={6}
        />
      </Card>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="inline-flex w-full items-center justify-center rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "saving..." : `reserve ${formatMoney(props.camp.price_cents)}`}
      </button>
    </form>
  );
}

export const CheckoutPage: React.FC = () => {
  const { campId } = useParams<{ campId: string }>();

  const [camp, setCamp] = useState<CampDetail | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [intentLoading, setIntentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
    };
    void run();
  }, []);

  useEffect(() => {
    const run = async () => {
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
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Could not load camp.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [campId]);

  useEffect(() => {
    const run = async () => {
      if (!camp) return;

      if (STRIPE_MODE !== "live") {
        setClientSecret(null);
        setIntentLoading(false);
        return;
      }

      setIntentLoading(true);
      setError(null);

      try {
        const resp = await postJSON<{ clientSecret: string }>(
          `${API_URL}/create-payment-intent`,
          {
            amount: camp.price_cents || 0,
            currency: "usd",
            campId: camp.id,
          },
        );

        if (!resp?.clientSecret) throw new Error("Missing clientSecret.");
        setClientSecret(resp.clientSecret);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Could not start checkout.");
      } finally {
        setIntentLoading(false);
      }
    };

    void run();
  }, [camp]);

  if (loading) return <div className="py-10 text-center">loading...</div>;

  if (error || !camp) {
    return (
      <div className="py-10 text-center text-red-600">
        {error || "camp not found"}
      </div>
    );
  }

  const heroImage = camp.hero_image_url || camp.image_url || "https://placehold.co/1200";

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:py-10">
      <SectionHeader title="checkout" className="mb-6" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {!user ? (
            <Card>
              <p className="text-sm text-gray-700">please sign in to continue</p>
            </Card>
          ) : STRIPE_MODE === "mock" ? (
            <MockCheckoutForm user={user} camp={camp} />
          ) : intentLoading ? (
            <Card>
              <p className="text-sm text-gray-700">preparing checkout...</p>
            </Card>
          ) : clientSecret && stripePromise ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                // Fix: remove unsupported `fields` option (caused TS2353).
                appearance: {
                  theme: "stripe",
                  variables: {
                    colorPrimary: "#111827",
                    colorBackground: "#F9FAFB",
                    borderRadius: "12px",
                  },
                },
              }}
            >
              <LiveCheckoutForm user={user} camp={camp} />
            </Elements>
          ) : (
            <Card>
              <p className="text-sm text-gray-700">checkout unavailable</p>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 overflow-hidden rounded-xl bg-gray-100">
                <img
                  src={heroImage}
                  alt={camp.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">camp</p>
                <p className="text-sm font-semibold truncate">{camp.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {camp.location || ""}
                </p>
              </div>
            </div>

            <dl className="mt-4 space-y-1 text-xs text-gray-700">
              <div className="flex justify-between">
                <dt>guests</dt>
                <dd>1 child</dd>
              </div>
              <div className="flex justify-between">
                <dt>price</dt>
                <dd>{formatMoney(camp.price_cents)}</dd>
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <dt>total</dt>
                <dd>{formatMoney(camp.price_cents)}</dd>
              </div>
            </dl>

            <p className="mt-3 text-[11px] text-gray-500">
              {STRIPE_MODE === "mock"
                ? "mock mode is on. no real payment is processed."
                : "checkout stays in wowzie."}
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default CheckoutPage;
