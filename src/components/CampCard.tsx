// src/components/CampCard.tsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCampFavorite } from "../hooks/useCampFavorite";

export type Camp = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  image_urls?: string[] | null;
  image_url?: string | null;
  hero_image_url?: string | null;
  price_cents?: number | null;
  meta?: any | null;
};

type CampCardProps = {
  camp: Camp;

  // Option B support: allow parent to control favorites (like activities.tsx)
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
};

export const CampCard: React.FC<CampCardProps> = ({
  camp,
  isFavorite: isFavoriteProp,
  onToggleFavorite,
}) => {
  const { id, slug, name, image_urls, image_url, hero_image_url, price_cents, meta } = camp;

  // Build an ordered list of candidate images
  const images = useMemo(() => {
    const candidates: string[] = [];
    if (hero_image_url) candidates.push(hero_image_url);
    if (image_urls?.length) candidates.push(...image_urls.filter(Boolean) as string[]);
    if (image_url) candidates.push(image_url);

    return candidates.length > 0 ? candidates : ["https://placehold.co/800"];
  }, [hero_image_url, image_urls, image_url]);

  const [index, setIndex] = useState(0);
  const dateLabel = meta?.dateLabel;

  const price =
    Number.isInteger(price_cents) && typeof price_cents === "number"
      ? `$${(price_cents / 100).toFixed(0)}`
      : "";

  // If parent passes favorite props, use them. Otherwise fall back to hook.
  const hook = useCampFavorite(id);
  const isControlled = typeof onToggleFavorite === "function" && typeof isFavoriteProp === "boolean";

  const isFavorite = isControlled ? isFavoriteProp : hook.isFavorite;
  const favoriteLoading = isControlled ? false : hook.favoriteLoading;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isControlled) {
      onToggleFavorite?.(id);
      return;
    }

    hook.toggleFavorite();
  };

  return (
    <article className="group relative flex flex-col rounded-2xl overflow-hidden bg-transparent">
      <div className="relative w-full aspect-square overflow-hidden rounded-2xl">
        <Link to={`/camp/${slug}`}>
          <img
            src={images[index]}
            alt={name}
            className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        </Link>

        {/* Favorite heart */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          disabled={favoriteLoading}
          className="absolute top-3 right-3 h-10 w-10 flex items-center justify-center rounded-full bg-white/90 hover:bg-white shadow-sm disabled:opacity-60"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <span className={`text-xl transition-colors ${isFavorite ? "text-red-500" : "text-gray-700"}`}>
            {isFavorite ? "♥" : "♡"}
          </span>
        </button>

        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIndex(i);
                }}
                className={`h-2 w-2 rounded-full ${i === index ? "bg-white" : "bg-white/50"}`}
                aria-label={`View image ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 pb-4 space-y-1">
        <Link to={`/camp/${slug}`} className="block text-sm font-semibold text-gray-900 hover:text-black">
          {name}
        </Link>

        {dateLabel && <p className="text-xs text-gray-600">{dateLabel}</p>}

        {price && (
          <p className="text-sm">
            <span className="font-semibold">{price}</span>
            <span className="text-gray-500"> per session</span>
          </p>
        )}
      </div>
    </article>
  );
};
