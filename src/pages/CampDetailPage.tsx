// src/pages/CampDetailPage.tsx
import React, { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/Button";
import { useCampFavorite } from "../hooks/useCampFavorite";
import type { Camp as BaseCamp } from "../components/CampCard";
import { InfoRow } from "../components/layout/InfoRow";

type FullCamp = BaseCamp & {
  location_city?: string | null;
  location_neighborhood?: string | null;
  host_id?: string | null;
  capacity?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  image_urls?: string[] | null;
};

type UserBooking = {
  id: string;
  status: string;
};

type SiblingDiscountType = "none" | "percent" | "amount";

type CampMetaAdvanced = {
  earlyDropoff?: {
    enabled?: boolean;
    price?: string | null;
    start?: string | null;
    end?: string | null;
  };
  extendedDay?: {
    enabled?: boolean;
    price?: string | null;
    start?: string | null;
    end?: string | null;
  };
  siblingDiscount?: {
    enabled?: boolean;
    type?: SiblingDiscountType;
    value?: string | null;

    // legacy support
    price?: string | null;
  };
};

const formatDateRange = (start?: string | null, end?: string | null): string | null => {
  if (!start && !end) return null;

  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;

  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
  };

  if (startDate && !endDate) return startDate.toLocaleDateString(undefined, opts);
  if (!startDate && endDate) return endDate.toLocaleDateString(undefined, opts);

  if (startDate && endDate) {
    return `${startDate.toLocaleDateString(undefined, opts)} – ${endDate.toLocaleDateString(
      undefined,
      opts
    )}`;
  }

  return null;
};

const cancellationPolicyToCopy = (policy?: string | null): string => {
  const p = (policy || "").trim();

  if (p === "flexible") {
    return "Full refund up to 48 hours before start. No refund after.";
  }
  if (p === "moderate") {
    return "Full refund up to 7 days before start. 50% refund up to 48 hours before start. No refund after.";
  }
  if (p === "strict") {
    return "Full refund up to 14 days before start. No refund after.";
  }
  if (p === "non_refundable") {
    return "This booking is non-refundable once reserved.";
  }

  // Backward-compatible fallback if old camps stored free-form text
  if (p) return p;

  return "See details at checkout.";
};

const formatMoneyLoose = (value?: string | null): string | null => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  // If someone typed "$25", keep it. If they typed "25", show "$25".
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return raw;

  const isWhole = Math.round(num) === num;
  return `$${isWhole ? num.toFixed(0) : num.toFixed(2)}`;
};

const formatPercentLoose = (value?: string | null): string | null => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const cleaned = raw.replace(/[^0-9.]/g, "");
  const num = Number(cleaned);

  if (Number.isFinite(num)) {
    const isWhole = Math.round(num) === num;
    const shown = isWhole ? num.toFixed(0) : num.toFixed(1);
    return `${shown}%`;
  }

  // If they typed something odd, keep it.
  return raw.includes("%") ? raw : `${raw}%`;
};

const formatTimeRange = (start?: string | null, end?: string | null): string | null => {
  if (!start && !end) return null;
  if (start && end) return `${start}–${end}`;
  if (start) return `From ${start}`;
  return `Until ${end}`;
};

const formatSiblingDiscountLine = (sib?: CampMetaAdvanced["siblingDiscount"]): string | null => {
  if (!sib?.enabled) return null;

  const type = sib.type;
  const value = sib.value ?? null;

  // Legacy fallback
  const legacy = sib.price ?? null;

  if (type === "percent") {
    const pct = formatPercentLoose(value);
    if (!pct) return null;
    return `Sibling discount: ${pct} off each additional child`;
  }

  if (type === "amount") {
    const money = formatMoneyLoose(value);
    if (!money) return null;
    return `Sibling discount: ${money} off each additional child`;
  }

  // If enabled but type missing, attempt to show legacy or best effort
  const moneyLegacy = formatMoneyLoose(legacy);
  if (moneyLegacy) return `Sibling discount: ${moneyLegacy} off each additional child`;

  return null;
};

export const CampDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [camp, setCamp] = useState<FullCamp | null>(null);
  const [loadingCamp, setLoadingCamp] = useState(true);
  const [campError, setCampError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [booking, setBooking] = useState<UserBooking | null>(null);
  const [confirmedCount, setConfirmedCount] = useState<number | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(false);

  const shareInFlightRef = useRef(false);
  const [sharing, setSharing] = useState(false);

  const { isFavorite, favoriteLoading, toggleFavorite } = useCampFavorite(camp?.id ?? null);

  useEffect(() => {
    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error loading user:", error);
        setCurrentUser(null);
        return;
      }
      setCurrentUser(data.user ?? null);
    };

    void loadUser();
  }, []);

  useEffect(() => {
    const loadCamp = async () => {
      if (!slug) return;

      setLoadingCamp(true);
      setCampError(null);

      const { data, error } = await supabase.from("camps").select("*").eq("slug", slug).maybeSingle();

      if (error) {
        console.error("Error loading camp:", error);
        setCampError("We couldn’t load this camp.");
        setLoadingCamp(false);
        return;
      }

      setCamp(data as FullCamp);
      setLoadingCamp(false);
    };

    void loadCamp();
  }, [slug]);

  useEffect(() => {
    const loadBookingInfo = async () => {
      if (!camp?.id) return;

      setLoadingBooking(true);

      try {
        const confirmedRes = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("camp_id", camp.id)
          .eq("status", "confirmed");

        if (confirmedRes.error) {
          console.error("Error counting confirmed bookings:", confirmedRes.error);
        } else {
          setConfirmedCount(confirmedRes.count ?? null);
        }

        if (currentUser?.id) {
          const bookingRes = await supabase
            .from("bookings")
            .select("id, status")
            .eq("camp_id", camp.id)
            .eq("user_id", currentUser.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (bookingRes.error) {
            console.error("Error loading user booking:", bookingRes.error);
            setBooking(null);
          } else {
            setBooking(bookingRes.data ? (bookingRes.data as UserBooking) : null);
          }
        } else {
          setBooking(null);
        }
      } catch (err) {
        console.error("Unexpected error loading booking info:", err);
      } finally {
        setLoadingBooking(false);
      }
    };

    void loadBookingInfo();
  }, [camp?.id, currentUser?.id]);

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  if (loadingCamp) {
    return (
      <main className="flex-1 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <button
            type="button"
            className="mb-4 text-xs text-gray-500 hover:text-gray-700"
            onClick={handleBack}
          >
            ← Back to camps
          </button>
          <div className="rounded-3xl bg-white border border-black/5 shadow-sm px-6 py-8">
            <p className="text-sm text-gray-700">Loading camp…</p>
          </div>
        </div>
      </main>
    );
  }

  if (campError || !camp) {
    return (
      <main className="flex-1 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <button
            type="button"
            className="mb-4 text-xs text-gray-500 hover:text-gray-700"
            onClick={handleBack}
          >
            ← Back to camps
          </button>
          <div className="rounded-3xl bg-white border border-red-100 shadow-sm px-6 py-8">
            <p className="text-sm text-red-700">{campError || "We couldn’t find that camp."}</p>
          </div>
        </div>
      </main>
    );
  }

  const {
    id,
    name,
    description,
    image_urls,
    image_url,
    hero_image_url,
    price_cents,
    meta,
    location_city,
    location_neighborhood,
    host_id,
    capacity,
    start_time,
    end_time,
  } = camp;

  const imageCandidates: string[] = [];
  if (hero_image_url) imageCandidates.push(hero_image_url);
  if (image_urls?.length) imageCandidates.push(...image_urls.filter(Boolean));
  if (image_url) imageCandidates.push(image_url);

  const images = imageCandidates.length > 0 ? imageCandidates : ["https://placehold.co/1200"];

  const price = Number.isInteger(price_cents) ? `$${((price_cents || 0) / 100).toFixed(0)}` : "";

  const dateLabelFromMeta = meta?.dateLabel as string | undefined;
  const dateLabelFromTimes = formatDateRange(start_time ?? null, end_time ?? null);

  const displayDateLabel =
    (typeof dateLabelFromMeta === "string" && dateLabelFromMeta.trim() ? dateLabelFromMeta.trim() : null) ||
    dateLabelFromTimes;

  const ribbonLabel = (meta?.ribbonLabel as string | undefined) || "New session just released";

  const locationLine =
    location_neighborhood && location_city ? `${location_neighborhood}, ${location_city}` : location_city || "";

  const hostName = (meta?.host_name as string | undefined) || "Hosted on Wowzie";
  const hostOrg = (meta?.host_org as string | undefined) || meta?.host_label || "";

  const isHost = currentUser?.id && host_id ? currentUser.id === host_id : false;

  const now = new Date();
  const parsedEnd = end_time != null ? new Date(end_time) : start_time ? new Date(start_time) : null;
  const hasEnded = parsedEnd ? parsedEnd < now : false;

  const confirmed = typeof confirmedCount === "number" ? confirmedCount : 0;
  const totalCapacity = typeof capacity === "number" && capacity > 0 ? capacity : null;
  const isFull = totalCapacity != null ? confirmed >= totalCapacity : false;

  let statusVariant: "booked" | "full" | "ended" | null = null;

  if (hasEnded) statusVariant = "ended";
  else if (booking?.status === "confirmed") statusVariant = "booked";
  else if (isFull) statusVariant = "full";

  const cancellationPolicy = cancellationPolicyToCopy((meta?.cancellation_policy as string | undefined) ?? null);

  const minAge = meta?.min_age as number | undefined;
  const maxAge = meta?.max_age as number | undefined;

  let guestRequirements = "This activity is for school-age guests.";
  if (minAge && maxAge) guestRequirements = `This activity is for guests ages ${minAge}–${maxAge}.`;
  else if (minAge) guestRequirements = `This activity is for guests ages ${minAge} and up.`;
  else if (maxAge) guestRequirements = `This activity is for guests up to age ${maxAge}.`;

  // Add-ons pulled from meta.advanced
  const advanced = (meta?.advanced || {}) as CampMetaAdvanced;

  const early = advanced.earlyDropoff;
  const ext = advanced.extendedDay;
  const sib = advanced.siblingDiscount;

  const earlyEnabled = Boolean(early?.enabled);
  const extEnabled = Boolean(ext?.enabled);

  const siblingLine = formatSiblingDiscountLine(sib);
  const sibEnabled = Boolean(siblingLine);

  const hasAddons = earlyEnabled || extEnabled || sibEnabled;

  const earlyParts = [formatTimeRange(early?.start, early?.end), formatMoneyLoose(early?.price)].filter(Boolean);
  const extParts = [formatTimeRange(ext?.start, ext?.end), formatMoneyLoose(ext?.price)].filter(Boolean);

  const addonsBody = [
    earlyEnabled ? `Early dropoff${earlyParts.length ? `: ${earlyParts.join(" · ")}` : ""}` : null,
    extEnabled ? `Extended day${extParts.length ? `: ${extParts.join(" · ")}` : ""}` : null,
    sibEnabled ? siblingLine : null,
  ]
    .filter(Boolean)
    .join("\n");

  const handleShare = async () => {
    const url = window.location.href;

    if (shareInFlightRef.current) return;

    const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;
    const canClipboard = typeof navigator !== "undefined" && !!navigator.clipboard?.writeText;

    shareInFlightRef.current = true;
    setSharing(true);

    try {
      if (canNativeShare) {
        await (navigator as any).share({
          title: name,
          text: "Check out this camp on Wowzie",
          url,
        });
        return;
      }

      if (canClipboard) {
        await navigator.clipboard.writeText(url);
        return;
      }

      window.prompt("Copy this link:", url);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      if (err?.name === "InvalidStateError") return;
      console.error("Share failed:", err);
    } finally {
      shareInFlightRef.current = false;
      setSharing(false);
    }
  };

  const handleMessage = () => {
    navigate(`/messages?campId=${id}`);
  };

  const handleReserve = () => {
    navigate(`/checkout/${id}`);
  };

  return (
    <main className="flex-1 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <button
          type="button"
          className="mb-4 text-xs text-gray-500 hover:text-gray-700"
          onClick={handleBack}
        >
          ← Back to camps
        </button>

        <div className="grid gap-8 lg:grid-cols-2 items-start">
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-3xl bg-gray-100 aspect-[4/3]">
              <img src={images[0]} alt={name} className="w-full h-full object-cover" />
            </div>

            {isHost && (
              <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                <span>You have manage access for this event</span>
                <Button
                  size="xs"
                  variant="subtle"
                  className="text-xs px-3 py-1.5"
                  onClick={() => navigate(`/host/activities/${id}`)}
                >
                  Manage →
                </Button>
              </div>
            )}

            <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3 text-xs text-gray-800">
              <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-semibold text-gray-600">
                {hostName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Presented by</p>
                <p className="text-xs font-medium">{hostOrg || hostName}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-3xl bg-white border border-black/5 shadow-sm px-6 py-6 lg:py-7 flex flex-col gap-5">
              {ribbonLabel && (
                <p className="text-xs font-medium text-amber-700">
                  <span className="mr-1">⭐</span>
                  {ribbonLabel}
                </p>
              )}

              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">{name}</h1>
                {locationLine && <p className="mt-1 text-sm text-gray-600">{locationLine}</p>}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={toggleFavorite}
                  disabled={favoriteLoading}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                >
                  <span>{isFavorite ? "★" : "♡"}</span>
                  <span>{isFavorite ? "Favorited" : "Favorite"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  disabled={sharing}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                >
                  <span>👨‍👩‍👧</span>
                  <span>{sharing ? "Sharing…" : "Share"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleMessage}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  <span>💬</span>
                  <span>Message</span>
                </button>
              </div>

              <div className="pt-3 border-t border-black/5 space-y-1">
                {price && (
                  <p className="text-lg">
                    <span className="font-semibold">{price}</span>
                    <span className="text-gray-500 text-sm"> per session</span>
                  </p>
                )}

                {displayDateLabel && <p className="text-xs text-gray-600">{displayDateLabel}</p>}

                {totalCapacity != null && (
                  <p className="text-[11px] text-gray-500">
                    {confirmed}/{totalCapacity} spots booked
                    {loadingBooking ? " · Updating…" : ""}
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-3xl bg-white border border-black/5 shadow-sm px-6 py-5 text-xs space-y-2">
              {statusVariant === null && !hasEnded && !isFull && (
                <>
                  <p className="text-sm font-semibold text-gray-900">Ready to reserve?</p>
                  <Button className="w-full mt-2" size="md" onClick={handleReserve}>
                    Reserve a spot
                  </Button>
                  <p className="mt-2 text-[11px] text-gray-500">You won’t be charged yet.</p>
                </>
              )}

              {statusVariant === "booked" && (
                <>
                  <p className="text-sm font-semibold text-emerald-900">
                    ✅ You’re in. We can’t wait to see you!
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button
                      size="xs"
                      variant="subtle"
                      className="text-xs"
                      onClick={() => navigate("/activities/upcoming")}
                    >
                      View in Activities
                    </Button>
                    <Button size="xs" variant="ghost" className="text-xs" onClick={() => navigate("/messages")}>
                      Message host
                    </Button>
                  </div>
                </>
              )}

              {statusVariant === "full" && (
                <>
                  <p className="text-sm font-semibold text-rose-900">🚫 This session reached capacity.</p>
                  <Button size="xs" variant="subtle" className="mt-2 text-xs" onClick={() => navigate("/search")}>
                    See similar camps
                  </Button>
                </>
              )}

              {statusVariant === "ended" && (
                <>
                  <p className="text-sm font-semibold text-gray-900">This camp has ended.</p>
                  <Button
                    size="xs"
                    variant="ghost"
                    className="mt-2 bg-gray-900 text-white text-xs hover:bg-gray-800"
                    onClick={() => navigate("/search")}
                  >
                    See similar camps
                  </Button>
                </>
              )}
            </section>

            <section className="rounded-3xl bg-white border border-black/5 shadow-sm px-6 py-6 space-y-6">
              <InfoRow icon="📅" title="Cancellation policy" body={cancellationPolicy} />
              <InfoRow icon="👤" title="Guest requirements" body={guestRequirements} />

              {hasAddons && <InfoRow icon="➕" title="Add-ons" body={addonsBody} />}

              <InfoRow
                icon="♿"
                title="Accessibility"
                body="Please contact the host in advance to discuss accommodations."
              />

              <Button size="xs" variant="ghost" className="mt-2">
                Report this event
              </Button>
            </section>

            <section className="rounded-3xl bg-white border border-black/5 shadow-sm px-6 py-6">
              <h2 className="text-sm font-semibold text-gray-900">About this camp</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                {description ||
                  "The host hasn’t added a full description yet, but this camp offers hands-on, curiosity-driven activities in a small-group setting."}
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
};

export default CampDetailPage;
