"use client";

import { MoreVertical } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";

/* ── Types ─────────────────────────────────────────────── */

export type FriendKid = {
  name: string;
  age: number | null;
};

export type FriendListItemProps = {
  /** Parent's full display name, e.g. "Rachel Kushner" */
  name: string;
  /** Optional profile photo URL */
  avatarUrl?: string | null;
  /** Children belonging to this friend */
  kids?: FriendKid[];
  /** Called when the row itself is clicked */
  onClick?: () => void;
  /** Called when the ⋮ menu button is clicked */
  onMenuClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

/* ── Helpers ────────────────────────────────────────────── */

function formatKids(kids: FriendKid[]): string {
  if (kids.length === 0) return "";
  const parts = kids.map((k) =>
    k.age != null ? `${k.name} (${k.age})` : k.name
  );
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/* ── Component ──────────────────────────────────────────── */

export function FriendListItem({
  name,
  avatarUrl,
  kids = [],
  onClick,
  onMenuClick,
}: FriendListItemProps) {
  const kidsLine = formatKids(kids);

  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      {/* Clickable left+center area */}
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <UserAvatar name={name} avatarUrl={avatarUrl} size={40} className="shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{name}</p>
          {kidsLine && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{kidsLine}</p>
          )}
        </div>
      </button>

      {/* ⋮ menu — separate click target, doesn't bubble to row */}
      <button
        type="button"
        onClick={onMenuClick}
        className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
        aria-label="More options"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
    </div>
  );
}
