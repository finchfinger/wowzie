"use client";

import { useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";

export type ActivityListItemProps = {
  title: string;
  timeLabel: string;
  heroImageUrl?: string | null;
  slug?: string | null;
  /** If provided, a ⋮ button renders and calls this when clicked */
  onMenuClick?: () => void;
};

export function ActivityListItem({
  title,
  timeLabel,
  heroImageUrl,
  slug,
  onMenuClick,
}: ActivityListItemProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 py-3">
      {/* Clickable left side → camp detail */}
      <button
        type="button"
        onClick={() => slug && router.push(`/camp/${slug}`)}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        {/* Thumbnail */}
        <div className="h-11 w-11 rounded-xl overflow-hidden bg-muted shrink-0 flex items-center justify-center">
          {heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImageUrl} alt={title} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl">🏕️</span>
          )}
        </div>

        {/* Text */}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{timeLabel}</p>
        </div>
      </button>

      {/* ⋮ menu button */}
      {onMenuClick && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMenuClick();
          }}
          className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground transition-colors"
          aria-label="More options"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
