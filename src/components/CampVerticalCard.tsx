"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { getPriceUnit } from "@/lib/pricing";
import type { Camp } from "./CampCard";

type CampVerticalCardProps = {
  camp: Camp;
};

const resolvePrice = (camp: Camp): string | null => {
  const { price_cents, meta } = camp;
  if (typeof price_cents === "number" && price_cents > 0)
    return `$${Math.round(price_cents / 100)}`;

  const cs = meta?.classSchedule as Record<string, unknown> | undefined;
  const perClass = cs?.pricePerClass ?? cs?.pricePerMeeting;
  if (perClass) {
    const n = parseFloat(String(perClass));
    if (Number.isFinite(n) && n > 0) return `$${Math.round(n)}`;
  }

  const pricing = meta?.pricing as Record<string, unknown> | undefined;
  if (typeof pricing?.price_cents === "number" && (pricing.price_cents as number) > 0)
    return `$${Math.round((pricing.price_cents as number) / 100)}`;

  return null;
};

const resolveImage = (camp: Camp): string => {
  if (camp.hero_image_url) return camp.hero_image_url;
  if (Array.isArray(camp.image_urls) && camp.image_urls.length > 0) return camp.image_urls[0];
  if (camp.image_url) return camp.image_url;
  return "https://placehold.co/400";
};

const resolveDate = (camp: Camp): string | null => {
  const fmtDate = (iso: string) => {
    const d = new Date(iso.includes("T") ? iso : iso + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  };
  if (camp.start_time) return `Starts ${fmtDate(camp.start_time)}`;
  if (camp.session_start) return `Starts ${fmtDate(camp.session_start)}`;
  if (typeof camp.meta?.dateLabel === "string" && camp.meta.dateLabel.trim())
    return camp.meta.dateLabel.trim();
  return null;
};

export function CampVerticalCard({ camp }: CampVerticalCardProps) {
  const { slug, name } = camp;
  const image = useMemo(() => resolveImage(camp), [camp]);
  const price = useMemo(() => resolvePrice(camp), [camp]);
  const unit = useMemo(() => getPriceUnit(camp), [camp]);
  const dateStr = useMemo(() => resolveDate(camp), [camp]);

  return (
    <Link
      href={`/camp/${slug}`}
      className="group block focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-lg"
      aria-label={`View ${name}`}
    >
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
        <Image
          src={image}
          alt={name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>

      {/* Text */}
      <div className="mt-2 flex flex-col gap-0.5">
        {dateStr && (
          <p
            className="text-muted-foreground truncate"
            style={{ fontSize: 12, lineHeight: "16px" }}
          >
            {dateStr}
          </p>
        )}
        <p
          className="font-bold text-foreground line-clamp-2"
          style={{ fontSize: 14, lineHeight: "20px" }}
        >
          {name}
        </p>
        {price && (
          <p
            className="text-muted-foreground"
            style={{ fontSize: 12, lineHeight: "16px" }}
          >
            {price} {unit}
          </p>
        )}
      </div>
    </Link>
  );
}

export function CampVerticalCardSkeleton() {
  return (
    <div>
      <div className="aspect-square w-full rounded-lg bg-muted animate-pulse" />
      <div className="mt-2 space-y-2">
        <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
        <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/4 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}
