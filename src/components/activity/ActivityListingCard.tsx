// src/components/activity/ActivityListingCard.tsx
import React from "react";
import { Link } from "react-router-dom";
import { IconButton } from "../ui/IconButton";
import { Badge } from "../ui/Badge";

type ActivityListingCardProps = {
  href: string;
  title: string;
  timeLabel?: string;
  imageUrl?: string | null;
  placeholderLabel?: string;
  statusLabel?: string;
  statusTone?: "neutral" | "destructive";
  onOpenMenu?: () => void;
};

export const ActivityListingCard: React.FC<ActivityListingCardProps> = ({
  href,
  title,
  timeLabel,
  imageUrl,
  placeholderLabel = "",
  statusLabel,
  statusTone = "neutral",
  onOpenMenu,
}) => {
  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Link
      to={href}
      className="block rounded-xl border border-black/5 bg-white shadow-sm hover:shadow transition"
    >
      <article className="flex items-center gap-3 px-3 py-2">
        {/* Thumbnail */}
        <div className="h-14 w-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center text-[10px] text-gray-500">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="px-1 text-center leading-tight">
              {placeholderLabel}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {title}
          </p>
          <p className="text-xs text-gray-500">
            {timeLabel && timeLabel.length > 0 ? timeLabel : "Time not set"}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {statusLabel && (
            <Badge tone={statusTone} size="sm">
              {statusLabel}
            </Badge>
          )}

          <div onClick={stop}>
            <IconButton
              ariaLabel="More actions"
              onClick={onOpenMenu}
              variant="ghost"
            >
              ⋮
            </IconButton>
          </div>
        </div>
      </article>
    </Link>
  );
};
