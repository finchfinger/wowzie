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
  price_unit?: string | null;

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
    <article className="flex flex-col">
      <div className="aspect-square rounded-xl overflow-hidden">
        <Skeleton className="h-full w-full" rounded="xl" />
      </div>

      <div className="pt-4 space-y-2">
        <Skeleton className="h-4 w-3/4" rounded="md" />
        {showDateLabel && <Skeleton className="h-3 w-2/5" rounded="md" />}
        {showPrice && <Skeleton className="h-4 w-1/2" rounded="md" />}
      </div>
    </article>
  );
};

/* ---------- helpers ---------- */

const formatPrice = (price_cents?: number | null) => {
  if (typeof price_cents !== "number" || !Number.isFinite(price_cents)) return null;
  if (price_cents <= 0) return null;
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

  const out = Array.from(new Set(candidates));
  return out.length ? out : ["https://placehold.co/800"];
};

/* ---------- card ---------- */

export const CampCard: React.FC<CampCardProps> = ({
  camp,
  isFavorite: isFavoriteProp,
  onToggleFavorite,
}) => {
  const { id, slug, name, meta } = camp;

  const images = useMemo(() => buildImageList(camp), [camp]);
  const [imageIndex, setImageIndex] = useState(0);
  const safeIndex = imageIndex >= 0 && imageIndex < images.length ? imageIndex : 0;

  const price = useMemo(() => formatPrice(camp.price_cents), [camp.price_cents]);
  const unit = useMemo(() => getPriceUnit(camp), [camp]);

  const dateLabel: string | null =
    typeof meta?.dateLabel === "string" && meta.dateLabel.trim()
      ? meta.dateLabel.trim()
      : null;

  const favoriteHook = useCampFavorite(id);
  const isControlled =
    typeof onToggleFavorite === "function" && typeof isFavoriteProp === "boolean";

  const isFavorite = isControlled ? isFavoriteProp : favoriteHook.isFavorite;
  const favoriteLoading = isControlled ? false : favoriteHook.favoriteLoading;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isControlled) {
      onToggleFavorite!(id);
      return;
    }

    favoriteHook.toggleFavorite();
  };

  return (
    <article className="group relative">
      {/* FULL TILE LINK */}
      <Link
        to={`/camp/${slug}`}
        className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-200 focus:ring-offset-2"
        aria-label={`View ${name}`}
      >
        {/* IMAGE */}
        <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
          <img
            src={images[safeIndex]}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />

</div>

        {/* CONTENT */}
        <div className="pt-4 space-y-1">
          <div className="text-sm font-semibold text-gray-900">{name}</div>

          {dateLabel && <div className="text-xs text-gray-600">{dateLabel}</div>}

          {price && (
            <div className="text-sm">
              <span className="font-semibold">{price}</span>
              <span className="text-gray-500"> {unit}</span>
            </div>
          )}
        </div>
      </Link>

      {/* FAVORITE (outside link, so it won't navigate) */}
      <button
        type="button"
        onClick={handleFavoriteClick}
        disabled={favoriteLoading}
        className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white disabled:opacity-60"
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <span className={isFavorite ? "text-red-500" : "text-gray-700"}>
          {isFavorite ? "♥" : "♡"}
        </span>
      </button>
    </article>
  );
};
