// src/pages/activities/ActivitiesUpcomingPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type BookingRow = {
  id: string;
  status: string;
  guests_count: number;
  total_cents: number;
  currency: string;
  created_at: string;
  camp: {
    id: string;
    slug: string | null;
    name: string;
    location: string | null;
    image_url: string | null;
    hero_image_url: string | null;
    start_time: string | null;
    end_time: string | null;
    meta: any | null;
  } | null;
};

const formatMoney = (cents: number, currency: string) => {
  const amount = (Number(cents || 0) / 100).toFixed(2);
  const cur = (currency || "usd").toUpperCase();
  return `${cur === "USD" ? "$" : ""}${amount}${cur !== "USD" ? ` ${cur}` : ""}`;
};

const formatWhen = (camp: BookingRow["camp"]) => {
  if (!camp) return "Dates to be confirmed";

  // Preferred: explicit label from meta if present
  const label =
    (typeof camp.meta?.dateLabel === "string" && camp.meta.dateLabel.trim()
      ? camp.meta.dateLabel.trim()
      : null) ||
    (typeof camp.meta?.dateRangeLabel === "string" && camp.meta.dateRangeLabel.trim()
      ? camp.meta.dateRangeLabel.trim()
      : null);

  // If camp has timestamps, build a richer label with time
  const start = camp.start_time ? new Date(camp.start_time) : null;
  const end = camp.end_time ? new Date(camp.end_time) : null;

  const dateOpts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

  if (start) {
    const datePart = start.toLocaleDateString(undefined, dateOpts);
    const timePart = start.toLocaleTimeString(undefined, timeOpts);

    // If end exists, we can show a time range
    if (end) {
      const sameDay = start.toDateString() === end.toDateString();
      const endTimePart = end.toLocaleTimeString(undefined, timeOpts);

      if (sameDay) {
        return `${datePart} · ${timePart} to ${endTimePart}`;
      }

      const endDatePart = end.toLocaleDateString(undefined, dateOpts);
      return `${datePart} ${timePart} to ${endDatePart} ${endTimePart}`;
    }

    // Only start time known
    return `${datePart} · ${timePart}`;
  }

  // Fall back to whatever meta label exists
  if (label) return label;

  return "Dates to be confirmed";
};

const ActivitiesUpcomingPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        if (!mounted) return;
        setUserId(null);
        setBookings([]);
        setError("We couldn’t check your sign-in status.");
        setLoading(false);
        return;
      }

      const uid = userData.user?.id ?? null;
      if (!mounted) return;

      setUserId(uid);

      if (!uid) {
        setBookings([]);
        setLoading(false);
        return;
      }

      const { data, error: qErr } = await supabase
        .from("bookings")
        .select(
          `
          id,
          status,
          guests_count,
          total_cents,
          currency,
          created_at,
          camp:camps (
            id,
            slug,
            name,
            location,
            image_url,
            hero_image_url,
            start_time,
            end_time,
            meta
          )
        `
        )
        .eq("user_id", uid)
        .in("status", ["confirmed", "pending"])
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (qErr) {
        console.error("[ActivitiesUpcomingPage] bookings query error:", qErr);
        setBookings([]);
        setError("We couldn’t load your bookings. This is usually an RLS policy issue.");
        setLoading(false);
        return;
      }

      setBookings((data as any) || []);
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const hasBookings = bookings.length > 0;

  const items = useMemo(() => {
    return bookings.map((b) => {
      const name = b.camp?.name ?? "Activity";
      const location = b.camp?.location ?? "Location coming soon";
      const when = formatWhen(b.camp);

      const img =
        b.camp?.hero_image_url ||
        b.camp?.image_url ||
        "https://placehold.co/160";

      return {
        id: b.id,
        name,
        location,
        when,
        img,
        total: formatMoney(b.total_cents, b.currency),
        guests: b.guests_count ?? 1,
        status: b.status,
        campSlug: b.camp?.slug ?? null,
      };
    });
  }, [bookings]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Upcoming activities</h2>

      <p className="text-sm text-gray-500">
        Camps and classes you’ve booked will appear here once they’re confirmed.
      </p>

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          Loading your bookings…
        </div>
      )}

      {!loading && !userId && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-600">
          Please sign in to see your upcoming activities.
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-white p-6 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && userId && !error && !hasBookings && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-600">
          <div className="mb-3">You don&apos;t have any upcoming activities yet.</div>
          <button
            type="button"
            onClick={() => navigate("/search")}
            className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white"
          >
            Find an activity
          </button>
        </div>
      )}

      {!loading && userId && !error && hasBookings && (
        <div className="space-y-3">
          {items.map((it) => (
            <div
              key={it.id}
              className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm flex gap-4"
            >
              <div className="h-20 w-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                <img src={it.img} alt={it.name} className="h-full w-full object-cover" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {it.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{it.location}</div>
                    <div className="text-xs text-gray-500">{it.when}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{it.total}</div>
                    <div className="text-xs text-gray-500">
                      {it.guests} child{it.guests === 1 ? "" : "ren"}
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-black/10 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600">
                    {it.status}
                  </span>

                  {it.campSlug && (
                    <button
                      type="button"
                      onClick={() => navigate(`/camp/${it.campSlug}`)}
                      className="text-[11px] text-violet-700 hover:underline"
                    >
                      View camp
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivitiesUpcomingPage;
export { ActivitiesUpcomingPage };
