"use client";

import { UserAvatar } from "@/components/ui/UserAvatar";
import { ActionsMenu } from "@/components/ui/ActionsMenu";

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
    conversationId?: string;
  } | null;
};

type NotificationItemProps = {
  notification: NotificationData;
  onToggleRead: (id: string, nextIsRead: boolean) => void;
  onDelete: (id: string) => void;
  onApprove?: (notifId: string, bookingId: string) => void;
  onDecline?: (notifId: string, bookingId: string) => void;
  onReply?: (notifId: string) => void;
  /** Called when a message notification row is clicked */
  onNavigate?: (notifId: string) => void;
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

  if (type === "camp_reminder" && campName) {
    return (
      <p className="text-sm text-foreground leading-snug">
        <strong className="font-semibold">{campName}</strong>
        {" begins tomorrow"}
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

/* ── NotificationItem ─────────────────────────────────── */

export function NotificationItem({
  notification,
  onToggleRead,
  onDelete,
  onApprove,
  onDecline,
  onReply,
  onNavigate,
}: NotificationItemProps) {
  const { id, type, is_read, created_at, meta } = notification;
  const isRead = !!is_read;

  const actorName = meta?.actorName || "Unknown";
  const messageBody = meta?.messageBody || notification.body;
  const bookingId = meta?.bookingId;

  const showApproveDecline = type === "booking_pending" && !!bookingId;
  const showReply = type === "message" && !!messageBody;
  const showBodyBox = showApproveDecline || showReply;

  const isClickable = type === "message" && !!onNavigate;

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? () => onNavigate(id) : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === "Enter" || e.key === " ") onNavigate(id); } : undefined}
      className={`flex items-start gap-3 px-8 py-4 transition-colors ${
        !isRead ? "bg-primary/[0.03]" : ""
      } ${isClickable ? "cursor-pointer hover:bg-muted/40" : ""}`}
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
                onClick={(e) => { e.stopPropagation(); onReply?.(id); }}
                className="text-xs font-medium text-foreground border border-border rounded-lg px-3 py-1 hover:bg-muted transition-colors"
              >
                Reply
              </button>
            )}

            {showApproveDecline && bookingId && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onDecline?.(id, bookingId)}
                  className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors"
                >
                  Decline <span className="text-[11px]">✕</span>
                </button>
                <button
                  type="button"
                  onClick={() => onApprove?.(id, bookingId)}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
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
        <ActionsMenu
          items={[
            { label: isRead ? "Mark as unread" : "Mark as read", onSelect: () => onToggleRead(id, !isRead) },
            { label: "Delete", onSelect: () => onDelete(id), tone: "destructive", separator: true },
          ]}
        />
      </div>
    </div>
  );
}
