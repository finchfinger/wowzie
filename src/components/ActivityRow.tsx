"use client";

import { ActionsMenu } from "@/components/ui/ActionsMenu";

/* ── Types ─────────────────────────────────────────────── */

export type ActivityRowStatus =
  | "live"
  | "paused"
  | "draft"
  | "in_review"
  | "rejected";

export type ActivityRowData = {
  id: string;
  name: string;
  thumbnailUrl?: string | null;
  scheduleLabel?: string | null;
  priceLabel?: string | null;
  enrollmentLabel?: string | null;
  isFull?: boolean;
  startBadge?: string | null;
  status?: ActivityRowStatus | null;
};

export type ActivityRowAction = {
  label: string;
  tone?: "destructive";
  separator?: boolean;
  onSelect: () => void;
};

type Props = {
  listing: ActivityRowData;
  actions?: ActivityRowAction[];
  onClick?: () => void;
};

/* ── StatusBadge ───────────────────────────────────────── */

function StatusBadge({ status }: { status: ActivityRowStatus }) {
  const map: Record<ActivityRowStatus, { label: string; className: string; dotClass: string }> = {
    live:      { label: "Live",      className: "border-emerald-200 bg-emerald-50 text-emerald-700",   dotClass: "bg-emerald-500" },
    paused:    { label: "Paused",    className: "border-amber-200 bg-amber-50 text-amber-700",         dotClass: "bg-amber-500" },
    draft:     { label: "Draft",     className: "border-border bg-muted text-muted-foreground",        dotClass: "bg-muted-foreground/50" },
    in_review: { label: "In review", className: "border-violet-200 bg-violet-50 text-violet-700",     dotClass: "bg-violet-400" },
    rejected:  { label: "Rejected",  className: "border-destructive/30 bg-destructive/10 text-destructive", dotClass: "bg-destructive/60" },
  };
  const { label, className, dotClass } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-medium ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}

/* ── ActivityRow ──────────────────────────────────── */

export function ActivityRow({ listing, actions = [], onClick }: Props) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      className={`group flex items-center gap-4 py-3 transition-colors ${onClick ? "cursor-pointer hover:bg-muted/50 focus:outline-none" : ""}`}
    >
      {/* Col 1: Thumbnail + name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="shrink-0 overflow-hidden rounded-sm bg-muted" style={{ width: 56, height: 56 }}>
          {listing.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.thumbnailUrl} alt={listing.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-muted" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">{listing.name}</p>
            {listing.startBadge && (
              <span className="shrink-0 text-[11px] font-medium text-violet-600">{listing.startBadge}</span>
            )}
          </div>
          {/* Enrollment + status — mobile only */}
          <div className="mt-1 flex items-center gap-2 sm:hidden">
            {listing.status && <StatusBadge status={listing.status} />}
            {listing.enrollmentLabel && (
              <span className={`text-xs ${listing.isFull ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                {listing.enrollmentLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Col 2: Dates — desktop only */}
      <div className="hidden sm:block w-48 shrink-0">
        <p className="text-sm text-muted-foreground truncate">{listing.scheduleLabel ?? "—"}</p>
      </div>

      {/* Col 3: Enrollment — desktop only */}
      <div className="hidden sm:block w-36 shrink-0">
        <p className={`text-sm ${listing.isFull ? "font-medium text-destructive" : "text-muted-foreground"}`}>
          {listing.enrollmentLabel ?? "—"}
        </p>
      </div>

      {/* Col 4: Status — desktop only */}
      {listing.status && (
        <div className="hidden sm:flex w-28 shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
          <StatusBadge status={listing.status} />
        </div>
      )}

      {/* Actions menu */}
      {actions.length > 0 && (
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <ActionsMenu items={actions} />
        </div>
      )}
    </div>
  );
}
