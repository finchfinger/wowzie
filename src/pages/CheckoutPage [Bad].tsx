import React, { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "../lib/supabase";

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as
  | string
  | undefined;

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:4242";

const MOCK_CHECKOUT =
  String(import.meta.env.VITE_STRIPE_MOCK_CHECKOUT || "").toLowerCase() === "true";

type CreateSessionResponse =
  | { url: string }
  | { sessionId: string }
  | { session_id: string }
  | { error: string };

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

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { campId: campIdParam } = useParams<{ campId: string }>();
  const [params] = useSearchParams();

  const campId = (campIdParam || "").trim();
  const quantity = Math.max(1, Number(params.get("qty") || "1") || 1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stripePromise = useMemo(() => {
    if (!STRIPE_PUBLISHABLE_KEY) return null;
    return loadStripe(STRIPE_PUBLISHABLE_KEY);
  }, []);

  const canPay = Boolean(campId) && (!MOCK_CHECKOUT ? Boolean(STRIPE_PUBLISHABLE_KEY) : true);

  const handlePay = async () => {
    setError(null);

    if (!campId) {
      setError("Missing camp.");
      return;
    }

    setLoading(true);

    try {
      // Signed-in user email (since checkout route is protected, this should exist)
      const { data: userResp, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw new Error(userErr.message);
      const user = userResp.user;
      if (!user) throw new Error("Please sign in to continue.");

      const customerEmail =
        user.email || (user.user_metadata?.email as string | undefined);

      if (MOCK_CHECKOUT) {
        navigate(`/checkout/complete?session_id=mock_session&paid=true`);
        return;
      }

      if (!stripePromise) {
        throw new Error("Payment system is not configured (missing publishable key).");
      }

      const data = await postJSON<CreateSessionResponse>(
        `${API_URL}/create-checkout-session`,
        {
          campId,
          quantity,
          customerEmail: customerEmail || undefined,
        }
      );

      if ("error" in data && data.error) throw new Error(data.error);

      // If backend returns a URL, go straight there
      if ("url" in data && data.url) {
        window.location.href = data.url;
        return;
      }

      const sessionId =
        ("sessionId" in data && data.sessionId) ||
        ("session_id" in data && data.session_id);

      if (!sessionId) throw new Error("Could not start checkout.");

      const stripe = await stripePromise;
      if (!stripe) throw new Error("Could not start checkout.");

      const result = await stripe.redirectToCheckout({ sessionId });
      if (result.error) throw new Error(result.error.message || "Could not start checkout.");
    } catch (e: any) {
      setError(e?.message || "Could not start checkout.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10">
      <h1 className="text-2xl font-semibold">checkout</h1>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="text-sm text-gray-700">
          <div className="font-medium text-gray-900">order summary</div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-gray-600">item</div>
            <div className="font-mono text-gray-900">{campId || "—"}</div>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <div className="text-gray-600">quantity</div>
            <div className="font-mono text-gray-900">{quantity}</div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handlePay}
          disabled={!canPay || loading}
          className={[
            "mt-5 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold shadow-sm",
            "bg-violet-600 text-white hover:bg-violet-700",
            "disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-700",
          ].join(" ")}
        >
          {loading ? "starting checkout..." : "pay now"}
        </button>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
        >
          back
        </button>
      </div>
    </div>
  );
};

export default CheckoutPage;
