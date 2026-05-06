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

  // Auto-advance
  useEffect(() => {
    if (!autoAdvance || items.length <= 1) return;
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % items.length);
    }, autoAdvance);
    return () => clearInterval(id);
  }, [autoAdvance, items.length]);

  if (!items.length) return null;

  return (
    <div className={`flex gap-2 overflow-hidden ${className}`} style={{ height: "clamp(220px, 38vw, 420px)" }}>
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
              flex: isActive ? "4 4 0%" : "1 1 0%",
              borderRadius: 20,
              transition: "flex 0.5s cubic-bezier(0.2, 0, 0, 1)",
              minWidth: isActive ? 0 : 48,
            }}
            onClick={() => !isActive && setActiveIndex(i)}
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
