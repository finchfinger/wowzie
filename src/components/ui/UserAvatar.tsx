"use client";

import { cn } from "@/lib/utils";

/* ── 10-colour palette ─────────────────────────────────── */

const AVATAR_COLORS = [
  "#4A7CFB", // blue
  "#F5A623", // amber
  "#34C77B", // emerald
  "#F05252", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#14B8A6", // teal
  "#F97316", // orange
  "#6366F1", // indigo
  "#84CC16", // lime
] as const;

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ── Component ─────────────────────────────────────────── */

type UserAvatarProps = {
  /** Display name — used for the initial and colour derivation */
  name: string;
  /** Optional profile photo URL; overrides the monogram */
  avatarUrl?: string | null;
  /** Diameter in px (default 40) */
  size?: number;
  className?: string;
};

export function UserAvatar({
  name,
  avatarUrl,
  size = 40,
  className,
}: UserAvatarProps) {
  const safeName = (name || "?").trim();
  const initial = safeName.charAt(0).toUpperCase();
  const color = getAvatarColor(safeName);
  const fontSize = Math.round(size * 0.5);

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={safeName}
        className={cn("rounded-full object-cover shrink-0", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={safeName}
      className={cn(
        "inline-flex items-center justify-center rounded-full shrink-0 select-none",
        className,
      )}
      style={{ width: size, height: size, backgroundColor: color }}
    >
      <span
        className="font-bold text-white leading-none font-sans"
        style={{ fontSize }}
      >
        {initial}
      </span>
    </div>
  );
}
