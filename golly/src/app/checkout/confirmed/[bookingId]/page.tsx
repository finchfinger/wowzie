"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type BookingDetail = {
  id: string;
  guests_count?: number | null;
  total_cents?: number | null;
  contact_email?: string | null;
  camp: {
    name: string;
    location?: string | null;
    hero_image_url?: string | null;
    image_url?: string | null;
    slug?: string | null;
  } | null;
};

const formatPrice = (cents?: number | null) => {
  if (!cents) return null;
  return `$${(cents / 100).toFixed(0)}`;
};

export default function CheckoutConfirmedPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) { setLoading(false); return; }
    const load = async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, guests_count, total_cents, contact_email, camp:camp_id(name, location, hero_image_url, image_url, slug)")
        .eq("id", bookingId)
        .single();

      setBooking(data as BookingDetail | null);
      setLoading(false);
    };
    void load();
  }, [bookingId]);

  const thumb = booking?.camp?.hero_image_url || booking?.camp?.image_url || null;
  const price = formatPrice(booking?.total_cents);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 space-y-6">
      {/* Success header */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">
            &#x2713;
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          Booking confirmed!
        </h1>
        <p className="text-sm text-muted-foreground">
          Your reservation has been saved. Check your email for details.
        </p>
      </div>

      {/* Booking summary card */}
      {!loading && booking && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {thumb && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={thumb}
              alt={booking.camp?.name ?? "Camp"}
              className="w-full h-40 object-cover"
            />
          )}
          <div className="px-5 py-4 space-y-3">
            {booking.camp?.name && (
              <p className="text-base font-semibold text-foreground">
                {booking.camp.name}
              </p>
            )}
            <div className="space-y-1.5 text-sm text-muted-foreground">
              {booking.camp?.location && (
                <p>📍 {booking.camp.location}</p>
              )}
              {booking.guests_count && (
                <p>👤 {booking.guests_count} guest{booking.guests_count > 1 ? "s" : ""}</p>
              )}
              {price && (
                <p>💳 {price} total</p>
              )}
              {booking.contact_email && (
                <p>✉️ {booking.contact_email}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add to calendar (placeholder) */}
      <button
        type="button"
        className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
      >
        📅 Add to calendar
      </button>

      {/* Nav buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Back to home
        </Link>
        <Link
          href="/search"
          className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent"
        >
          Browse more camps
        </Link>
      </div>

      {/* Booking ID — small, at bottom */}
      {bookingId && (
        <p className="text-center text-xs text-muted-foreground">
          Booking ID: {bookingId}
        </p>
      )}
    </div>
  );
}
