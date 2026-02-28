"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useCampFavorite } from "@/hooks/useCampFavorite";

type FavoriteButtonProps = {
  campId: string;
  /** Initial favorite state (from server) */
  initialFavorited?: boolean;
  className?: string;
  size?: "sm" | "md";
};

export function FavoriteButton({
  campId,
  initialFavorited = false,
  className,
  size = "md",
}: FavoriteButtonProps) {
  const { isFavorite, favoriteLoading, toggleFavorite } = useCampFavorite(campId);

  const sizeClasses = size === "sm"
    ? "h-7 w-7 text-base"
    : "h-9 w-9 text-lg";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggleFavorite();
      }}
      disabled={favoriteLoading}
      aria-label={isFavorite ? "Remove from wishlist" : "Save to wishlist"}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-all",
        "bg-white/90 backdrop-blur-sm shadow-sm hover:scale-110 active:scale-95",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        sizeClasses,
        className
      )}
    >
      {isFavorite ? "❤️" : "🤍"}
    </button>
  );
}
