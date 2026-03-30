"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, ChevronDown, Check, Pause } from "lucide-react";

/* ── types ────────────────────────────────────────────── */

export type ListingCardData = {
  id: string;
  name: string;
  slug: string | null;
  image_url: string | null;
  hero_image_url: string | null;
  status: string | null;
  meta: any;
  capacity: number | null;
  start_time: string | null;
  end_time: string | null;
  bookingCount: number;
  pendingCount: number;
};

type ListingCardProps = {
  listing: ListingCardData;
  onStatusChange: (id: string, newStatus: "active" | "inactive") => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
};

/* ── helpers ──────────────────────────────────────────── */

function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}${m ? `:${String(m).padStart(2, "0")}` : ""}${ampm}`;
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getPriceLabel(meta: any): string | null {
  if (!meta) return null;
  const display = meta?.pricing?.display;
  if (display) return String(display);
  const base = meta?.pricing?.basePrice;
  if (base) return `$${base}`;
  return null;
}

function getScheduleLabel(listing: ListingCardData): string | null {
  const meta = listing.meta;

  // fixedSchedule (single-week camp)
  const fs = meta?.fixedSchedule;
  if (fs?.startDate) {
    let label = fmtDate(fs.startDate);
    if (fs.endDate && fs.endDate !== fs.startDate)
      label += `–${fmtDate(fs.endDate)}`;
    if (fs.startTime && fs.endTime)
      label += ` · ${fmtTime(fs.startTime)}–${fmtTime(fs.endTime)}`;
    return label;
  }

  // campSessions (class with multiple slots)
  const sessions: any[] = meta?.campSessions ?? [];
  if (sessions.length > 0) {
    const first = sessions[0];
    const last = sessions[sessions.length - 1];
    if (first?.startDate) {
      let label = fmtDate(first.startDate);
      if (last?.endDate && last.endDate !== first.startDate)
        label += `–${fmtDate(last.endDate)}`;
      if (first.startTime && first.endTime)
        label += ` · ${fmtTime(first.startTime)}–${fmtTime(first.endTime)}`;
      if (sessions.length > 1) label = `${sessions.length} sessions · ${label}`;
      return label;
    }
  }

  // direct start_time field
  if (listing.start_time) {
    return new Date(listing.start_time).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  return null;
}

/* ── StatusBadge ──────────────────────────────────────── */

function StatusBadge({
  status,
  onStatusChange,
}: {
  status: "active" | "inactive";
  onStatusChange: (s: "active" | "inactive") => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isLive = status === "active";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
        }}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${
          isLive
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isLive ? "bg-emerald-500" : "bg-amber-500"
          }`}
        />
        {isLive ? "Live" : "Paused"}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-border bg-popover shadow-lg z-30 overflow-hidden">
          {/* Live option */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange("active");
              setOpen(false);
            }}
            className="flex w-full items-start gap-3 px-3 py-2.5 hover:bg-accent transition-colors text-left"
          >
            <Check
              className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                isLive ? "text-emerald-600" : "text-transparent"
              }`}
            />
            <div>
              <p className="text-xs font-medium text-foreground">Live</p>
              <p className="text-[11px] text-muted-foreground">
                Accept bookings
              </p>
            </div>
          </button>

          {/* Paused option */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange("inactive");
              setOpen(false);
            }}
            className="flex w-full items-start gap-3 px-3 py-2.5 hover:bg-accent transition-colors text-left border-t border-border/50"
          >
            <Pause
              className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                !isLive ? "text-amber-600" : "text-transparent"
              }`}
            />
            <div>
              <p className="text-xs font-medium text-foreground">Paused</p>
              <p className="text-[11px] text-muted-foreground">
                Hidden from parents
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

/* ── ActionsMenu ──────────────────────────────────────── */

type ActionItem = {
  label: string;
  onSelect: () => void;
  tone?: "default" | "destructive";
  separator?: boolean;
};

function ActionsMenu({ items }: { items: ActionItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
        }}
        aria-label="More actions"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 transition-colors"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-border bg-popover shadow-lg z-30 overflow-hidden py-1">
          {items.map((item, idx) => (
            <div key={idx}>
              {item.separator && <div className="my-1 h-px bg-border" />}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  item.onSelect();
                  setOpen(false);
                }}
                className={`flex w-full items-center px-3 py-2 text-xs transition-colors text-left ${
                  item.tone === "destructive"
                    ? "text-destructive hover:bg-destructive/8"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── ListingCard ──────────────────────────────────────── */

export function ListingCard({
  listing,
  onStatusChange,
  onDelete,
  onDuplicate,
}: ListingCardProps) {
  const router = useRouter();
  const thumb = listing.hero_image_url || listing.image_url;
  const status = (
    listing.status === "active" ? "active" : "inactive"
  ) as "active" | "inactive";

  const priceLabel = getPriceLabel(listing.meta);
  const scheduleLabel = getScheduleLabel(listing);

  const confirmedSpotsTaken = listing.bookingCount;
  const spotsLeft =
    listing.capacity != null
      ? Math.max(0, listing.capacity - confirmedSpotsTaken)
      : null;
  const isFull = spotsLeft === 0 && listing.capacity != null;

  const handleShareListing = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!listing.slug) return;
    const url = `${window.location.origin}/camp/${listing.slug}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* silent */
    }
  };

  const handleCardClick = () => {
    router.push(`/host/activities/${listing.id}`);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleCardClick();
      }}
      className="group flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-4 hover:bg-muted/20 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {/* Thumbnail */}
      <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-muted">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={listing.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-2xl select-none">
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {listing.name}
        </p>
        <div className="mt-1 space-y-0.5">
          {priceLabel && (
            <p className="text-xs text-muted-foreground">{priceLabel}</p>
          )}
          {scheduleLabel && (
            <p className="text-xs text-muted-foreground">{scheduleLabel}</p>
          )}
          <p
            className={`text-xs font-medium ${
              isFull ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {listing.capacity == null
              ? null
              : isFull
              ? "Full"
              : `${spotsLeft} of ${listing.capacity} spot${listing.capacity !== 1 ? "s" : ""} left`}
          </p>
          {listing.pendingCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
              {listing.pendingCount} pending
            </span>
          )}
        </div>
      </div>

      {/* Right: status badge + menu — clicks don't bubble to card */}
      <div
        className="flex items-center gap-2 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <StatusBadge
          status={status}
          onStatusChange={(s) => onStatusChange(listing.id, s)}
        />
        <ActionsMenu
          items={[
            {
              label: "Go to listing",
              onSelect: () => {
                if (listing.slug) router.push(`/camp/${listing.slug}`);
              },
            },
            {
              label: "Message guests",
              onSelect: () =>
                router.push(`/messages?camp=${listing.id}`),
            },
            {
              label: "Share listing",
              onSelect: () => {
                if (!listing.slug) return;
                const url = `${window.location.origin}/camp/${listing.slug}`;
                navigator.clipboard.writeText(url).catch(() => {});
              },
            },
            {
              label: "Duplicate listing",
              onSelect: () => onDuplicate(listing.id),
            },
            {
              label: "Delete listing",
              tone: "destructive",
              separator: true,
              onSelect: () => onDelete(listing.id),
            },
          ]}
        />
      </div>
    </div>
  );
}
