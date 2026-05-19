"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export type CarouselItem = {
  name: string;
  slug: string;
  short_id?: string | null;
  image: string;
};

type M3CarouselProps = {
  items: CarouselItem[];
  /** Auto-advance interval in ms. Default 6000. Pass 0 to disable. */
  autoAdvance?: number;
  className?: string;
};

/**
 * M3 multi-browse carousel.
 *
 * Shows up to 3 items with graduated flex weights (hero → medium → small peek),
 * matching the Material Design 3 multi-browse layout. All items share the same
 * 16dp corner radius (M3 extraLarge shape token). Clicking an inactive item
 * rotates it to the hero position.
 */
export function M3Carousel({ items, autoAdvance = 6000, className = "" }: M3CarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Auto-advance
  useEffect(() => {
    if (!autoAdvance || items.length <= 1) return;
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % items.length);
    }, autoAdvance);
    return () => clearInterval(id);
  }, [autoAdvance, items.length]);

  if (!items.length) return null;

  const visibleItems = items.slice(0, 3);

  /**
   * M3 multi-browse graduated weights.
   * Position 0 (hero): 5 — Position 1 (medium): 1.6 — Position 2 (peek): 0.9
   * Items rotate into the hero slot on click.
   */
  const WEIGHTS = [5, 1.6, 0.75];

  // Map each visible item to its display position relative to activeIndex
  const getFlex = (i: number) => {
    const pos = (i - activeIndex + visibleItems.length) % visibleItems.length;
    const weight = WEIGHTS[pos] ?? WEIGHTS[WEIGHTS.length - 1];
    return `${weight} ${weight} 0%`;
  };

  const getPosition = (i: number) =>
    (i - activeIndex + visibleItems.length) % visibleItems.length;

  return (
    <div
      className={`flex overflow-hidden h-[320px] md:h-[400px] ${className}`}
      style={{ gap: 2 }}
    >
      {visibleItems.map((item, i) => {
        const isActive = i === activeIndex;
        const pos = getPosition(i);
        // Min-width: hero has no min, others get a sliver to stay visible
        const minWidth = pos === 0 ? 0 : pos === 1 ? 80 : 44;

        return (
          <div
            key={`${item.slug}-${i}`}
            role={isActive ? undefined : "button"}
            tabIndex={isActive ? undefined : 0}
            aria-label={isActive ? undefined : `View ${item.name}`}
            className="relative overflow-hidden flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            style={{
              flex: getFlex(i),
              borderRadius: 8,
              minWidth,
              transition: "flex 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            onClick={() => {
              if (!isActive) setActiveIndex(i);
            }}
            onMouseEnter={() => !isActive && setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            onKeyDown={(e) => {
              if (!isActive && (e.key === "Enter" || e.key === " ")) setActiveIndex(i);
            }}
          >
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 80vw, 60vw"
              className="object-cover"
              priority={i === 0}
            />


            {/* Camp name pill — hero item only */}
            {isActive && (
              <div className="absolute" style={{ bottom: 10, left: 10 }}>
                {item.slug ? (
                  <Link
                    href={item.short_id ? `/activity/${item.short_id}` : `/camp/${item.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center bg-white font-medium hover:bg-white/90 transition-colors"
                    style={{ fontSize: 11, height: 28, borderRadius: 4, color: "rgba(0,0,0,0.6)", paddingLeft: 10, paddingRight: 10 }}
                  >
                    {item.name}
                  </Link>
                ) : (
                  <span className="inline-flex items-center bg-white font-medium"
                    style={{ fontSize: 11, height: 28, borderRadius: 4, color: "rgba(0,0,0,0.6)", paddingLeft: 10, paddingRight: 10 }}>
                    {item.name}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
