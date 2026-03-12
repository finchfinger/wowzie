"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";

/* ── Types ─────────────────────────────────────────────── */

export type NotificationData = {
  id: string;
  created_at: string;
  type?: string | null;
  is_read?: boolean | null;
  title?: string | null;
  body?: string | null;
  meta?: {
    actorName?: string;
    actorAvatarUrl?: string | null;
    campName?: string;
    childName?: string;
    messageBody?: string;
    bookingId?: string;
    campId?: string;
    campSlug?: string;
  } | null;
};

type NotificationItemProps = {
  notification: NotificationData;
  onToggleRead: (id: string, nextIsRead: boolean) => void;
  onDelete: (id: string) => void;
  onApprove?: (notifId: string, bookingId: string) => void;
  onDecline?: (notifId: string, bookingId: string) => void;
  onReply?: (notifId: string) => void;
};

/* ── Helpers ───────────────────────────────────────────── */

function relTime(iso?: string | null): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function typeLabel(type?: string | null): string {
  if (!type) return "Update";
  if (
    type === "booking_confirmed" ||
    type === "booking_pending" ||
    type === "booking_canceled"
  )
    return "Booking";
  if (type === "message") return "Message";
  if (type === "calendar_share") return "Calendar";
  if (type.startsWith("play_")) return "Playing";
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
}

/* ── Title renderer (rich bold segments) ─────────────────── */

function NotificationTitle({
  notification,
}: {
  notification: NotificationData;
}) {
  const { type, title, meta } = notification;
  const actorName = meta?.actorName;
  const campName = meta?.campName;
  const childName = meta?.childName;

  if (type === "booking_confirmed" && actorName && campName && childName) {
    return (
      <p className="text-sm text-foreground leading-snug">
        <strong className="font-semibold">{actorName}</strong>
        {" booked "}
        <strong className="font-semibold">{campName}</strong>
        {" for "}
        <strong className="font-semibold">{childName}</strong>
      </p>
    );
  }

  if (type === "booking_pending" && actorName && campName && childName) {
    return (
      <p className="text-sm text-foreground leading-snug">
        <strong className="font-semibold">{actorName}</strong>
        {" requested a spot in "}
        <strong className="font-semibold">{campName}</strong>
        {" for "}
        <strong className="font-semibold">{childName}</strong>
      </p>
    );
  }

  if (type === "booking_canceled" && actorName && campName && childName) {
    return (
      <p className="text-sm text-foreground leading-snug">
        <strong className="font-semibold">{actorName}</strong>
        {" canceled "}
        <strong className="font-semibold">{campName}</strong>
        {" for "}
        <strong className="font-semibold">{childName}</strong>
      </p>
    );
  }

  if (type === "message" && campName) {
    return (
      <p className="text-sm text-foreground leading-snug">
        <strong className="font-semibold">{campName}</strong>
        {" sent you a message"}
      </p>
    );
  }

  // Generic fallback
  return (
    <p className="text-sm text-foreground leading-snug">
      {title || "Notification"}
    </p>
  );
}

/* ── Three-dot context menu ───────────────────────────── */

function NotifMenu({
  isRead,
  onToggleRead,
  onDelete,
}: {
  isRead: boolean;
  onToggleRead: () => void;
  onDelete: () => void;
}) {
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
        aria-label="More options"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-border bg-popover shadow-lg z-30 overflow-hidden py-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleRead();
              setOpen(false);
            }}
            className="flex w-full items-center px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors text-left"
          >
            {isRead ? "Mark as unread" : "Mark as read"}
          </button>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              setOpen(false);
            }}
            className="flex w-full items-center px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors text-left"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

/* ── NotificationItem ─────────────────────────────────── */

export function NotificationItem({
  notification,
  onToggleRead,
  onDelete,
  onApprove,
  onDecline,
  onReply,
}: NotificationItemProps) {
  const { id, type, is_read, created_at, meta } = notification;
  const isRead = !!is_read;

  const actorName = meta?.actorName || "Unknown";
  const messageBody = meta?.messageBody || notification.body;
  const bookingId = meta?.bookingId;

  const showApproveDecline = type === "booking_pending" && !!bookingId;
  const showReply = type === "message" && !!messageBody;
  const showBodyBox = showApproveDecline || showReply;

  return (
    <div
      className={`flex items-start gap-3 px-5 py-4 ${
        !isRead ? "bg-primary/[0.03]" : ""
      }`}
    >
      {/* Avatar */}
      <div className="mt-0.5 shrink-0">
        <UserAvatar
          name={actorName}
          avatarUrl={meta?.actorAvatarUrl}
          size={40}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Title + meta row */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <NotificationTitle notification={notification} />
            <p className="mt-0.5 text-xs text-muted-foreground">
              {relTime(created_at)}
              {type && <span> · {typeLabel(type)}</span>}
            </p>
          </div>

          {/* Unread dot */}
          {!isRead && (
            <span
              className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0"
              aria-label="Unread"
            />
          )}
        </div>

        {/* Expandable body box */}
        {showBodyBox && (
          <div className="rounded-xl border border-border bg-background px-3 py-2.5 space-y-2.5">
            {messageBody && showReply && (
              <p className="text-xs text-foreground leading-relaxed">
                {messageBody}
              </p>
            )}

            {showReply && (
              <button
                type="button"
                onClick={() => onReply?.(id)}
                className="text-xs font-medium text-foreground border border-border rounded-full px-3 py-1 hover:bg-muted transition-colors"
              >
                Reply
              </button>
            )}

            {showApproveDecline && bookingId && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onDecline?.(id, bookingId)}
                  className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors"
                >
                  Decline <span className="text-[11px]">✕</span>
                </button>
                <button
                  type="button"
                  onClick={() => onApprove?.(id, bookingId)}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  Approve <span className="text-[11px]">✓</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Three-dot menu */}
      <div className="shrink-0 -mt-1">
        <NotifMenu
          isRead={isRead}
          onToggleRead={() => onToggleRead(id, !isRead)}
          onDelete={() => onDelete(id)}
        />
      </div>
    </div>
  );
}
