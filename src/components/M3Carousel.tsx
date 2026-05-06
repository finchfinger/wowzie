"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export type CarouselItem = {
  name: string;
  slug: string;
  image: string;
};

type M3CarouselProps = {
  items: CarouselItem[];
  /** Auto-advance interval in ms. Default 6000. Pass 0 to disable. */
  autoAdvance?: number;
  className?: string;
};

export function M3Carousel({ items, autoAdvance = 6000, className = "" }: M3CarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Auto-advance — reset on manual interaction
  useEffect(() => {
    if (!autoAdvance || items.length <= 1) return;
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % items.length);
    }, autoAdvance);
    return () => clearInterval(id);
  }, [autoAdvance, items.length]);

  if (!items.length) return null;

  const getFlex = (i: number) => {
    if (i === activeIndex) return "5 5 0%";
    if (i === hoveredIndex) return "1.5 1.5 0%"; // expand on hover
    return "1 1 0%";
  };

  return (
    <div
      className={`flex gap-2 overflow-hidden ${className}`}
      style={{ height: "clamp(220px, 38vw, 420px)" }}
    >
      {items.map((item, i) => {
        const isActive = i === activeIndex;
        return (
          <div
            key={`${item.slug}-${i}`}
            role={isActive ? undefined : "button"}
            tabIndex={isActive ? undefined : 0}
            aria-label={isActive ? undefined : `View ${item.name}`}
            className="relative overflow-hidden flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            style={{
              flex: getFlex(i),
              borderRadius: 20,
              transition: "flex 0.3s cubic-bezier(0.2, 0, 0, 1)",
              minWidth: isActive ? 0 : 48,
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
              className="object-cover transition-transform duration-300"
              style={{ transform: hoveredIndex === i ? "scale(1.05)" : "scale(1)" }}
              priority={i === 0}
            />

            {/* Hover overlay on inactive items */}
            {!isActive && (
              <div
                className="absolute inset-0 bg-black/20 transition-opacity duration-300"
                style={{ opacity: hoveredIndex === i ? 0 : 0.35 }}
              />
            )}

            {/* Camp name pill — active item only */}
            {isActive && (
              <div className="absolute bottom-3 left-3">
                {item.slug ? (
                  <Link
                    href={`/camp/${item.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-white transition-colors shadow-sm"
                  >
                    {item.name}
                  </Link>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">
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
