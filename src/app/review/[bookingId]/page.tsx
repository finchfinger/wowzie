"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

/* ── Types ─────────────────────────────────────────── */

type BookingInfo = {
  id: string;
  camp_id: string;
  camp_name: string;
  camp_slug: string | null;
  camp_thumb: string | null;
  start_time: string | null;
};

/* ── Star Picker ────────────────────────────────────── */

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent!"];

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className="transition-transform hover:scale-110 focus:outline-none"
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill={(hover || value) >= n ? "#fbbf24" : "none"}
              stroke={(hover || value) >= n ? "#fbbf24" : "currentColor"}
              strokeWidth="1.5"
              className={`transition-colors ${(hover || value) >= n ? "text-amber-400" : "text-muted-foreground/40"}`}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground h-5">
        {labels[hover || value] ?? ""}
      </p>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────── */

export default function ReviewPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? null;
      setUserId(uid);

      if (!uid) {
        setLoading(false);
        return;
      }

      // Load booking + camp info
      const { data: bData } = await supabase
        .from("bookings")
        .select(
          "id, camp_id, camps:camp_id(id, name, slug, hero_image_url, image_url, start_time)"
        )
        .eq("id", bookingId)
        .eq("user_id", uid)
        .single();

      if (!bData) {
        setLoading(false);
        return;
      }

      const camp = (bData as any).camps;
      setBooking({
        id: bData.id,
        camp_id: bData.camp_id,
        camp_name: camp?.name ?? "This activity",
        camp_slug: camp?.slug ?? null,
        camp_thumb: camp?.hero_image_url ?? camp?.image_url ?? null,
        start_time: camp?.start_time ?? null,
      });

      // Check if already reviewed (gracefully handle if table doesn't exist)
      try {
        const { count } = await supabase
          .from("reviews")
          .select("id", { count: "exact", head: true })
          .eq("booking_id", bookingId)
          .eq("reviewer_id", uid);
        setAlreadyReviewed((count ?? 0) > 0);
      } catch {
        setAlreadyReviewed(false);
      }

      setLoading(false);
    };

    void load();
  }, [bookingId]);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a rating.");
      return;
    }
    if (!userId || !booking) return;

    setSubmitting(true);
    setError(null);

    const { error: insertErr } = await supabase.from("reviews").insert({
      booking_id: bookingId,
      camp_id: booking.camp_id,
      reviewer_id: userId,
      rating,
      body: body.trim() || null,
      is_published: true,
    });

    setSubmitting(false);

    if (insertErr) {
      setError("Could not submit review. Please try again.");
    } else {
      setSubmitted(true);
    }
  };

  /* ── States ── */

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 space-y-3">
        <p className="text-sm text-muted-foreground">
          Please sign in to leave a review.
        </p>
        <Link
          href="/activities"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← My Activities
        </Link>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 space-y-3">
        <p className="text-sm text-destructive">Booking not found.</p>
        <Link
          href="/activities"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← My Activities
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center text-3xl">
            ★
          </div>
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          Thanks for your review!
        </h1>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Your feedback helps families find the best activities for their kids.
        </p>
        <div className="flex flex-col gap-3 pt-2">
          <Button onClick={() => router.push("/activities")}>
            Back to My Activities
          </Button>
          {booking.camp_slug && (
            <Button
              variant="outline"
              onClick={() => router.push(`/camp/${booking.camp_slug}`)}
            >
              View activity page
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (alreadyReviewed) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-2xl">
            ✓
          </div>
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          Already reviewed
        </h1>
        <p className="text-sm text-muted-foreground">
          You&apos;ve already left a review for{" "}
          <span className="font-medium">{booking.camp_name}</span>.
        </p>
        <Button
          variant="outline"
          onClick={() => router.push("/activities")}
        >
          Back to My Activities
        </Button>
      </div>
    );
  }

  const dateStr = booking.start_time
    ? new Date(booking.start_time).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto max-w-md px-4 py-10 space-y-6">
      {/* Back */}
      <Link
        href="/activities"
        className="inline-flex text-xs text-muted-foreground hover:text-foreground"
      >
        ← My Activities
      </Link>

      {/* Heading */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Leave a review
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Share your experience with other families.
        </p>
      </div>

      {/* Camp summary */}
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <div className="h-12 w-12 rounded-xl overflow-hidden bg-muted shrink-0">
          {booking.camp_thumb ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={booking.camp_thumb}
              alt={booking.camp_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-2xl">
              🏕️
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {booking.camp_name}
          </p>
          {dateStr && (
            <p className="text-xs text-muted-foreground mt-0.5">{dateStr}</p>
          )}
        </div>
      </div>

      {/* Review form */}
      <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
        {/* Stars */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            How would you rate this activity?
          </p>
          <StarPicker value={rating} onChange={setRating} />
        </div>

        {/* Divider */}
        <div className="border-t border-border/50" />

        {/* Review text */}
        <div className="space-y-1.5">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="review-body"
          >
            Your review{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </label>
          <textarea
            id="review-body"
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 500))}
            placeholder="Tell other families what you loved — what was great for the kids, any helpful tips…"
            rows={4}
            className="w-full rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 resize-none transition-colors"
          />
          <p className="text-xs text-muted-foreground text-right">
            {body.length}/500
          </p>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          className="w-full"
        >
          {submitting ? "Submitting…" : "Submit review"}
        </Button>
      </div>
    </div>
  );
}
