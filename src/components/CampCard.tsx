// src/components/CampCard.tsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCampFavorite } from "../hooks/useCampFavorite";
import { Skeleton } from "./ui/Skeleton";
import { getPriceUnit } from "../lib/pricing";

export type Camp = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;

  image_urls?: string[] | null;
  image_url?: string | null;
  hero_image_url?: string | null;

  price_cents?: number | null;

  // Add these (you already select listing_type on HomePage)
  listing_type?: "camp" | "series" | "class" | string | null;
  schedule_days?: string[] | null;

  meta?: any | null;
};

type CampCardProps = {
  camp: Camp;

  // Optional controlled favorite support
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
};

type CampCardSkeletonProps = {
  showDateLabel?: boolean;
  showPrice?: boolean;
};

export const CampCardSkeleton: React.FC<CampCardSkeletonProps> = ({
  showDateLabel = true,
  showPrice = true,
}) => {
  return (
    <article className="group relative flex flex-col rounded-xl overflow-hidden bg-transparent">
      <div className="relative w-full aspect-square overflow-hidden rounded-xl">
        <Skeleton className="h-full w-full" rounded="xl" />

        <div className="absolute top-3 right-3 h-10 w-10 rounded-full bg-white/90 shadow-sm flex items-center justify-center">
          <Skeleton className="h-5 w-5" rounded="full" />
        </div>
      </div>

      <div className="pt-4 pb-4 space-y-2">
        <Skeleton className="h-4 w-4/5" rounded="md" />
        {showDateLabel && <Skeleton className="h-3 w-2/5" rounded="md" />}
        {showPrice && <Skeleton className="h-4 w-1/2" rounded="md" />}
      </div>
    </article>
  );
};

const formatPrice = (price_cents?: number | null) => {
  if (typeof price_cents !== "number" || !Number.isFinite(price_cents)) return "";
  if (price_cents <= 0) return "";
  return `$${Math.round(price_cents / 100)}`;
};

const buildImageList = (camp: Camp) => {
  const candidates: string[] = [];

  if (camp.hero_image_url) candidates.push(camp.hero_image_url);

  if (Array.isArray(camp.image_urls) && camp.image_urls.length > 0) {
    for (const u of camp.image_urls) {
      if (typeof u === "string" && u.trim()) candidates.push(u.trim());
    }
  }

  if (camp.image_url && camp.image_url.trim()) candidates.push(camp.image_url.trim());

  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of candidates) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }

  return out.length ? out : ["https://placehold.co/800"];
};

export const CampCard: React.FC<CampCardProps> = ({
  camp,
  isFavorite: isFavoriteProp,
  onToggleFavorite,
}) => {
  const { id, slug, name, meta } = camp;

  const images = useMemo(() => buildImageList(camp), [camp]);
  const [index, setIndex] = useState(0);
  const safeIndex = index >= 0 && index < images.length ? index : 0;

  const dateLabel: string | null =
    typeof meta?.dateLabel === "string" && meta.dateLabel.trim()
      ? meta.dateLabel.trim()
      : null;

  const price = useMemo(() => formatPrice(camp.price_cents), [camp.price_cents]);
  const unit = useMemo(() => getPriceUnit(camp), [camp]);

  const hook = useCampFavorite(id);
  const isControlled =
    typeof onToggleFavorite === "function" && typeof isFavoriteProp === "boolean";

  const isFavorite = isControlled ? isFavoriteProp : hook.isFavorite;
  const favoriteLoading = isControlled ? false : hook.favoriteLoading;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isControlled) {
      onToggleFavorite(id);
      return;
    }

    hook.toggleFavorite();
  };

  return (
    <article className="group relative flex flex-col rounded-xl overflow-hidden bg-transparent">
      <div className="relative w-full aspect-square overflow-hidden rounded-xl">
        <Link to={`/camp/${slug}`} className="block h-full w-full">
          <img
            src={images[safeIndex]}
            alt={name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        </Link>

        <button
          type="button"
          onClick={handleFavoriteClick}
          disabled={favoriteLoading}
          className="absolute top-3 right-3 h-10 w-10 flex items-center justify-center rounded-full bg-white/90 hover:bg-white shadow-sm disabled:opacity-60"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <span
            className={`text-xl transition-colors ${
              isFavorite ? "text-red-500" : "text-gray-700"
            }`}
          >
            {isFavorite ? "♥" : "♡"}
          </span>
        </button>

        {/* No dots. Optional click-to-advance when multiple images */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIndex((prev) => (prev + 1) % images.length);
            }}
            className="absolute inset-0"
            aria-label="Next photo"
          />
        )}
      </div>

      <div className="pt-4 pb-4 space-y-1">
        <Link
          to={`/camp/${slug}`}
          className="block text-sm font-semibold text-gray-900 hover:text-black"
        >
          {name}
        </Link>

        {dateLabel && <p className="text-xs text-gray-600">{dateLabel}</p>}

        {price && (
          <p className="text-sm">
            <span className="font-semibold">{price}</span>
            <span className="text-gray-500"> {unit}</span>
          </p>
        )}
      </div>
    </article>
  );
};
