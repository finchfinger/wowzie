"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type BookingInfo = {
  id: string;
  camp_id: string;
  camp_name: string;
  camp_slug: string | null;
  camp_thumb: string | null;
};

export default function FeedbackPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [wentWell, setWentWell] = useState("");
  const [improve, setImprove] = useState("");
  const [bookAgain, setBookAgain] = useState<"yes" | "no" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? null;
      setUserId(uid);

      if (!uid) { setLoading(false); return; }

      const { data: bData } = await supabase
        .from("bookings")
        .select("id, camp_id, camps:camp_id(name, slug, hero_image_url, image_url)")
        .eq("id", bookingId)
        .eq("user_id", uid)
        .single();

      if (!bData) { setLoading(false); return; }

      const camp = (bData as any).camps;
      setBooking({
        id: bData.id,
        camp_id: bData.camp_id,
        camp_name: camp?.name ?? "This activity",
        camp_slug: camp?.slug ?? null,
        camp_thumb: camp?.hero_image_url ?? camp?.image_url ?? null,
      });

      // Check if already submitted
      try {
        const { count } = await supabase
          .from("feedback")
          .select("id", { count: "exact", head: true })
          .eq("booking_id", bookingId)
          .eq("user_id", uid);
        setAlreadySubmitted((count ?? 0) > 0);
      } catch {
        setAlreadySubmitted(false);
      }

      setLoading(false);
    };

    void load();
  }, [bookingId]);

  const handleSubmit = async () => {
    if (!userId || !booking) return;
    if (!wentWell.trim() && !improve.trim()) {
      setError("Please share at least a little feedback.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: insertErr } = await supabase.from("feedback").insert({
      booking_id: bookingId,
      camp_id: booking.camp_id,
      user_id: userId,
      went_well: wentWell.trim() || null,
      improve: improve.trim() || null,
      book_again: bookAgain,
    });

    setSubmitting(false);

    if (insertErr) {
      setError("Could not submit — please try again.");
    } else {
      // Mark feedback as received on the booking
      await supabase
        .from("bookings")
        .update({ feedback_submitted_at: new Date().toISOString() })
        .eq("id", bookingId);
      setSubmitted(true);
    }
  };

  /* ── States ─────────────────────────────────────────────── */

  if (loading) return (
    <div className="mx-auto max-w-md px-4 py-16 text-sm text-muted-foreground">Loading…</div>
  );

  if (!userId) return (
    <div className="mx-auto max-w-md px-4 py-16 space-y-3">
      <p className="text-sm text-muted-foreground">Please sign in to leave feedback.</p>
      <Link href="/activities" className="text-xs text-muted-foreground hover:text-foreground">← My Activities</Link>
    </div>
  );

  if (!booking) return (
    <div className="mx-auto max-w-md px-4 py-16 space-y-3">
      <p className="text-sm text-destructive">Booking not found.</p>
      <Link href="/activities" className="text-xs text-muted-foreground hover:text-foreground">← My Activities</Link>
    </div>
  );

  if (submitted) return (
    <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="material-symbols-rounded text-primary" style={{ fontSize: 32 }}>check_circle</span>
        </div>
      </div>
      <h1 className="text-xl font-semibold text-foreground">Thanks for sharing!</h1>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        Your feedback helps us and the camp keep improving for families like yours.
      </p>
      <Button onClick={() => router.push("/activities")} className="w-full">Back to My Activities</Button>
    </div>
  );

  if (alreadySubmitted) return (
    <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
        <span className="material-symbols-rounded text-muted-foreground" style={{ fontSize: 28 }}>check</span>
      </div>
      <h1 className="text-xl font-semibold text-foreground">Already submitted</h1>
      <p className="text-sm text-muted-foreground">You've already left feedback for <span className="font-medium">{booking.camp_name}</span>.</p>
      <Button variant="outline" onClick={() => router.push("/activities")}>Back to My Activities</Button>
    </div>
  );

  return (
    <main>
      <div className="page-container py-10">
        <div className="page-grid">
          <div className="span-8-center space-y-6">

            <Link href="/activities" className="inline-flex text-xs text-muted-foreground hover:text-foreground">
              ← My Activities
            </Link>

            <div>
              <h1 className="text-xl font-semibold text-foreground">How did it go?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Your feedback goes directly to the camp and helps us keep quality high. It&apos;s never shown publicly.
              </p>
            </div>

            {/* Camp summary */}
            <div className="flex items-center gap-3 rounded-card bg-card px-4 py-3">
              <div className="h-12 w-12 rounded-xl overflow-hidden bg-muted shrink-0">
                {booking.camp_thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={booking.camp_thumb} alt={booking.camp_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <span className="material-symbols-rounded text-muted-foreground" style={{ fontSize: 24 }}>forest</span>
                  </div>
                )}
              </div>
              <p className="text-sm font-medium text-foreground">{booking.camp_name}</p>
            </div>

            {/* Feedback form */}
            <div className="space-y-5 rounded-card bg-card p-5">

              {/* Q1 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="went-well">
                  What went well?
                </label>
                <textarea
                  id="went-well"
                  value={wentWell}
                  onChange={(e) => setWentWell(e.target.value.slice(0, 600))}
                  placeholder="What did your child enjoy? What stood out?"
                  rows={3}
                  className="w-full rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 resize-none transition-colors"
                />
                <p className="text-xs text-muted-foreground text-right">{wentWell.length}/600</p>
              </div>

              <div className="border-t border-border/50" />

              {/* Q2 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="improve">
                  Anything that could be better?
                </label>
                <textarea
                  id="improve"
                  value={improve}
                  onChange={(e) => setImprove(e.target.value.slice(0, 600))}
                  placeholder="Organisation, communication, facilities, activities…"
                  rows={3}
                  className="w-full rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 resize-none transition-colors"
                />
                <p className="text-xs text-muted-foreground text-right">{improve.length}/600</p>
              </div>

              <div className="border-t border-border/50" />

              {/* Q3 */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Would you book this camp again?</p>
                <div className="flex gap-3">
                  {(["yes", "no"] as const).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setBookAgain(bookAgain === val ? null : val)}
                      className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors"
                      style={{
                        background: bookAgain === val ? (val === "yes" ? "#f0fdf4" : "#fef2f2") : "transparent",
                        borderColor: bookAgain === val ? (val === "yes" ? "#86efac" : "#fca5a5") : undefined,
                        color: bookAgain === val ? (val === "yes" ? "#16a34a" : "#dc2626") : undefined,
                      }}
                    >
                      {val === "yes" ? "👍 Yes" : "👎 Not sure"}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting ? "Submitting…" : "Send feedback"}
              </Button>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
