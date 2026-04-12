"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Check,
  Pause,
  CircleDollarSign,
  Timer,
  UsersRound,
} from "lucide-react";
import { ActionsMenu, type ActionItem } from "@/components/ui/ActionsMenu";

/* ── types ────────────────────────────────────────────── */

export type HostListItemData = {
  id: string;
  name: string;
  slug: string | null;
  image_url: string | null;
  hero_image_url: string | null;
  status: string | null;
  is_published: boolean | null;
  meta: any;
  capacity: number | null;
  start_time: string | null;
  end_time: string | null;
  bookingCount: number;
  pendingCount: number;
};

type HostListItemProps = {
  listing: HostListItemData;
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

function fmtMoney(raw: string | number): string {
  const num = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return String(raw);
  return num % 1 === 0
    ? num.toLocaleString("en-US")
    : num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getPriceLabel(meta: any): string | null {
  if (!meta) return null;
  const display = meta?.pricing?.display;
  if (display) return `$${fmtMoney(display)}/session`;
  const base = meta?.pricing?.basePrice;
  if (base) return `$${fmtMoney(base)}`;
  return null;
}

function getScheduleLabel(listing: HostListItemData): string | null {
  const meta = listing.meta;

  const fs = meta?.fixedSchedule;
  if (fs?.startDate) {
    let label = fmtDate(fs.startDate);
    if (fs.endDate && fs.endDate !== fs.startDate)
      label += `–${fmtDate(fs.endDate)}`;
    if (fs.startTime && fs.endTime)
      label += ` from ${fmtTime(fs.startTime)}–${fmtTime(fs.endTime)}`;
    return label;
  }

  const sessions: any[] = meta?.campSessions ?? [];
  if (sessions.length > 0) {
    const first = sessions[0];
    const last = sessions[sessions.length - 1];
    if (first?.startDate) {
      let label = `Monday–Friday, ${fmtDate(first.startDate)}`;
      if (last?.endDate && last.endDate !== first.startDate)
        label += `–${fmtDate(last.endDate)}`;
      if (first.startTime && first.endTime)
        label += ` from ${fmtTime(first.startTime)}–${fmtTime(first.endTime)}`;
      return label;
    }
  }

  if (listing.start_time) {
    return new Date(listing.start_time).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  return null;
}

function getStartBadge(listing: HostListItemData): string | null {
  const meta = listing.meta;
  let startDateStr: string | null = null;

  const sessions: any[] = meta?.campSessions ?? [];
  if (sessions.length > 0 && sessions[0]?.startDate) {
    startDateStr = sessions[0].startDate;
  } else if (meta?.fixedSchedule?.startDate) {
    startDateStr = meta.fixedSchedule.startDate;
  } else if (listing.start_time) {
    startDateStr = listing.start_time.split("T")[0];
  }

  if (!startDateStr) return null;

  const start = new Date(`${startDateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((start.getTime() - today.getTime()) / 86400000);

  if (days < 0) return null;
  if (days === 0) return "Starts today";
  if (days <= 30) return `Starts in ${days} day${days !== 1 ? "s" : ""}`;
  return null;
}

/* ── StatusBadge ──────────────────────────────────────── */

function StatusBadge({
  status,
  isDraft,
  onStatusChange,
}: {
  status: "active" | "inactive";
  isDraft: boolean;
  onStatusChange: (s: "active" | "inactive") => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isLive = status === "active" && !isDraft;

  if (isDraft) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
        Draft
      </span>
    );
  }

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
        <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-popover shadow-lg z-30 overflow-hidden">
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
              <p className="text-[11px] text-muted-foreground">Accept bookings</p>
            </div>
          </button>

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
              <p className="text-[11px] text-muted-foreground">Hidden from customers</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

/* ── HostListItem ─────────────────────────────────────── */

export function HostListItem({
  listing,
  onStatusChange,
  onDelete,
  onDuplicate,
}: HostListItemProps) {
  const router = useRouter();
  const thumb = listing.hero_image_url || listing.image_url;
  const status = (listing.status === "active" ? "active" : "inactive") as
    | "active"
    | "inactive";
  const isDraft = listing.is_published === false;

  const priceLabel = getPriceLabel(listing.meta);
  const scheduleLabel = getScheduleLabel(listing);
  const startBadge = getStartBadge(listing);

  // Derive total capacity: top-level column first, then sum per-session capacities
  const sessionCapacityTotal: number | null = (() => {
    const sessions: any[] = listing.meta?.campSessions ?? [];
    if (!sessions.length) return null;
    const nums = sessions.map((s) => parseInt(s.capacity, 10)).filter((n) => !isNaN(n));
    return nums.length ? nums.reduce((a, b) => a + b, 0) : null;
  })();
  const totalCapacity = listing.capacity ?? sessionCapacityTotal;

  const confirmedSpotsTaken = listing.bookingCount;
  const spotsLeft =
    totalCapacity != null
      ? Math.max(0, totalCapacity - confirmedSpotsTaken)
      : null;
  const isFull = spotsLeft === 0 && totalCapacity != null;

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
      className="group flex items-center gap-4 cursor-pointer py-2 hover:bg-muted/50 transition-colors focus:outline-none"
    >
      {/* Thumbnail */}
      <div className="shrink-0 overflow-hidden bg-muted" style={{ width: 96, height: 96, borderRadius: 4 }}>
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={listing.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-2xl select-none bg-muted" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Title + badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground truncate">
            {listing.name}
          </p>
          {startBadge && (
            <span className="shrink-0 text-[11px] font-medium text-violet-600">
              {startBadge}
            </span>
          )}
        </div>

        {/* Info rows */}
        <div className="mt-1.5 space-y-0.5">
          {priceLabel && (
            <div className="flex items-center gap-1.5">
              <CircleDollarSign className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
              <p className="text-xs text-muted-foreground">{priceLabel}</p>
            </div>
          )}
          {scheduleLabel && (
            <div className="flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
              <p className="text-xs text-muted-foreground">{scheduleLabel}</p>
            </div>
          )}
          {totalCapacity != null && (
            <div className="flex items-center gap-1.5">
              <UsersRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
              <p
                className={`text-xs font-medium ${
                  isFull ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {isFull
                  ? "Full"
                  : `${spotsLeft?.toLocaleString()} of ${totalCapacity.toLocaleString()} spot${totalCapacity !== 1 ? "s" : ""} left`}
              </p>
            </div>
          )}
          {listing.pendingCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
              {listing.pendingCount} pending
            </span>
          )}
        </div>
      </div>

      {/* Right: status + menu */}
      <div
        className="flex items-center gap-2 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <StatusBadge
          status={status}
          isDraft={isDraft}
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
              onSelect: () => router.push(`/messages?camp=${listing.id}`),
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
              label: "Delete activity",
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
