import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:4242";

type SessionStatusResponse = {
  status?: string; // "complete", "open", etc (depends on your backend)
  payment_status?: string; // "paid", "unpaid", etc (depends on your backend)
  bookingId?: string;
  error?: string;
};

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "GET", credentials: "include" });
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

function isPaidLike(resp: SessionStatusResponse) {
  const ps = (resp.payment_status || "").toLowerCase();
  const st = (resp.status || "").toLowerCase();
  return ps === "paid" || st === "complete" || st === "completed";
}

export const CheckoutCompletePage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const sessionId = params.get("session_id") || "";
  const paidHint = (params.get("paid") || "").toLowerCase() === "true";

  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState<boolean>(paidHint);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(params.get("bookingId"));

  const canCheck = useMemo(() => Boolean(sessionId), [sessionId]);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!canCheck) {
        setLoading(false);
        setError("Missing session_id. This page should be opened from Stripe redirect.");
        return;
      }

      // If you are in mock mode, skip calling backend
      if (sessionId === "mock_session") {
        setLoading(false);
        setPaid(true);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Poll a few times so webhooks have time to process
        for (let i = 0; i < 6; i++) {
          const resp = await getJSON<SessionStatusResponse>(
            `${API_URL}/checkout-session-status?session_id=${encodeURIComponent(sessionId)}`
          );

          if (!alive) return;

          if (resp.error) throw new Error(resp.error);

          if (resp.bookingId) setBookingId(resp.bookingId);

          if (isPaidLike(resp)) {
            setPaid(true);
            setLoading(false);
            return;
          }

          // Wait 1s between polls
          await new Promise((r) => setTimeout(r, 1000));
        }

        setPaid(false);
        setLoading(false);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Could not verify payment.");
        setLoading(false);
      }
    };

    run();

    return () => {
      alive = false;
    };
  }, [API_URL, canCheck, sessionId]);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10">
      <h1 className="text-2xl font-semibold">payment status</h1>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        {loading ? (
          <>
            <div className="text-sm font-medium text-gray-900">confirming your payment...</div>
            <div className="mt-2 text-sm text-gray-600">
              This can take a moment while we process confirmation.
            </div>
          </>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : paid ? (
          <>
            <div className="text-sm font-semibold text-gray-900">confirmed</div>
            <div className="mt-2 text-sm text-gray-700">
              Your payment went through. You are all set.
            </div>

            {bookingId ? (
              <div className="mt-3 text-sm text-gray-700">
                booking id: <span className="font-mono">{bookingId}</span>
              </div>
            ) : null}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => navigate("/account/activities/upcoming")}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
              >
                view upcoming
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
              >
                back home
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm font-semibold text-gray-900">not confirmed yet</div>
            <div className="mt-2 text-sm text-gray-700">
              We could not verify payment completion. If you were charged, it may take a minute to sync.
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
              >
                refresh
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
              >
                back home
              </button>
            </div>
          </>
        )}

        <div className="mt-6 text-xs text-gray-500">
          session: <span className="font-mono">{sessionId || "missing"}</span>
        </div>
      </div>
    </div>
  );
};

export default CheckoutCompletePage;
