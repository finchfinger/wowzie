"use client";

import { MessageSquare, Pencil } from "lucide-react";

export type HostCardProps = {
  /** The host's display name */
  hostName: string;
  /** Optional profile photo URL; falls back to an initial monogram */
  hostAvatarUrl?: string | null;
  /**
   * When true the viewer IS the host — shows "Edit listing" instead of
   * "Send a message", and appends a "(that's you!)" note to the name.
   */
  isOwner?: boolean;
  /** Called when the "Send a message" button is clicked */
  onMessage?: () => void;
  /** Called when the "Edit listing" button is clicked */
  onEdit?: () => void;
};

export function HostCard({
  hostName,
  hostAvatarUrl,
  isOwner = false,
  onMessage,
  onEdit,
}: HostCardProps) {
  const initial = (hostName || "?").charAt(0).toUpperCase();

  return (
    <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3">
      {/* Left: avatar + label + name */}
      <div className="flex items-center gap-3 min-w-0">
        {hostAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hostAvatarUrl}
            alt={hostName}
            className="h-9 w-9 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground">Presented by</p>
          <p className="text-sm font-medium text-foreground truncate">
            {hostName}
            {isOwner && (
              <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                (that&apos;s you!)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Right: context-sensitive action button */}
      {isOwner ? (
        <button
          type="button"
          onClick={onEdit}
          className="ml-4 shrink-0 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit listing
        </button>
      ) : (
        <button
          type="button"
          onClick={onMessage}
          className="ml-4 shrink-0 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Send a message
        </button>
      )}
    </div>
  );
}
