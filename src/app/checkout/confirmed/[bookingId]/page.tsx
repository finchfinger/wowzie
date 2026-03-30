"use client";
import { MapPin, User, Mail, Calendar, MessageCircle } from "lucide-react";


import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

/* ── types ─────────────────────────────────────────────── */

type CampSession = {
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

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
    host_id?: string | null;
    meta?: {
      campSessions?: CampSession[];
    } | null;
  } | null;
};

/* ── helpers ─────────────────────────────────────────────── */

const formatPrice = (cents?: number | null) => {
  if (!cents) return null;
  return `$${(cents / 100).toFixed(0)}`;
};

/** Format "YYYY-MM-DD" → "Jul 14, 2026" */
function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Format date range, e.g. "Jul 14 – Jul 18, 2026" */
function fmtDateRange(start?: string | null, end?: string | null): string | null {
  if (!start) return null;
  if (!end || end === start) return fmtDate(start);
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const sameYear = s.getFullYear() === e.getFullYear();
  const startStr = s.toLocaleDateString("en-US", opts);
  const endStr = e.toLocaleDateString("en-US", {
    ...opts,
    ...(sameYear ? {} : { year: "numeric" }),
  });
  return `${startStr} – ${endStr}, ${e.getFullYear()}`;
}


/* ── page ─────────────────────────────────────────────── */

export default function CheckoutConfirmedPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) { setLoading(false); return; }
    const load = async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, guests_count, total_cents, contact_email, camp:camp_id(name, location, hero_image_url, image_url, slug, host_id, meta)")
        .eq("id", bookingId)
        .single();

      setBooking(data as BookingDetail | null);
      setLoading(false);
    };
    void load();
  }, [bookingId]);

  const thumb = booking?.camp?.hero_image_url || booking?.camp?.image_url || null;
  const price = formatPrice(booking?.total_cents);

  // Pull first camp session for dates
  const session = booking?.camp?.meta?.campSessions?.[0] ?? null;
  const dateRange = session ? fmtDateRange(session.startDate, session.endDate) : null;

  // "Message host" link
  const hostId = booking?.camp?.host_id ?? null;
  const messageHref = hostId ? `/messages?to=${encodeURIComponent(hostId)}` : null;

  return (
    <main>
      <div className="page-container py-16">
        <div className="page-grid">
          <div className="span-6-center space-y-6">
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
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {booking.camp.location}
                </p>
              )}
              {dateRange && (
                <p className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  {dateRange}
                </p>
              )}
              {booking.guests_count && (
                <p className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  {booking.guests_count} guest{booking.guests_count > 1 ? "s" : ""}
                </p>
              )}
              {price && (
                <p className="flex items-center gap-1.5">
                  <span className="text-base leading-none">💳</span>
                  {price} total
                </p>
              )}
              {booking.contact_email && (
                <p className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {booking.contact_email}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {messageHref && (
        <Link
          href={messageHref}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          Message the host
        </Link>
      )}

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
        </div>
      </div>
    </main>
  );
}
