"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { getPriceUnit } from "@/lib/pricing";
import type { Camp } from "./CampCard";

type CampListCardProps = {
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
  if (Array.isArray(camp.image_urls) && camp.image_urls.length > 0)
    return camp.image_urls[0];
  if (camp.image_url) return camp.image_url;
  return "https://placehold.co/200";
};

const resolveMeta = (camp: Camp): string | null => {
  // Date label
  const fmtDate = (iso: string) => {
    const d = new Date(iso.includes("T") ? iso : iso + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  let dateStr: string | null = null;
  if (typeof camp.meta?.dateLabel === "string" && camp.meta.dateLabel.trim()) {
    dateStr = camp.meta.dateLabel.trim();
  } else if (camp.start_time) {
    const s = fmtDate(camp.start_time);
    const e = camp.end_time ? fmtDate(camp.end_time) : null;
    dateStr = e && e !== s ? `${s} — ${e}` : s;
  } else if (camp.session_start) {
    const s = fmtDate(camp.session_start);
    const e = camp.session_end ? fmtDate(camp.session_end) : null;
    dateStr = e && e !== s ? `${s} — ${e}` : s;
  }

  // Session count / type label from meta.campSessions or listing_type
  const sessions = camp.meta?.campSessions as Array<unknown> | undefined;
  const sessionCount = Array.isArray(sessions) && sessions.length > 1
    ? `${sessions.length} sessions`
    : null;

  const typeLabel = (() => {
    if (camp.listing_type === "class") return "Weekly class";
    if (camp.listing_type === "series") return "Series";
    if (camp.listing_type === "camp") return null; // implied
    return null;
  })();

  const parts = [dateStr, sessionCount ?? typeLabel].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
};

export function CampListCard({ camp }: CampListCardProps) {
  const { slug, name } = camp;
  const image = useMemo(() => resolveImage(camp), [camp]);
  const price = useMemo(() => resolvePrice(camp), [camp]);
  const unit = useMemo(() => getPriceUnit(camp), [camp]);
  const metaLine = useMemo(() => resolveMeta(camp), [camp]);

  return (
    <Link
      href={`/camp/${slug}`}
      className="group flex items-center gap-4 rounded-xl p-2 -mx-2 hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
      aria-label={`View ${name}`}
    >
      {/* Thumbnail */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
        <Image
          src={image}
          alt={name}
          fill
          sizes="64px"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.05]"
        />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        {metaLine && (
          <p className="text-xs text-muted-foreground truncate mb-0.5">{metaLine}</p>
        )}
        <p className="text-sm font-semibold text-foreground truncate leading-snug">{name}</p>
        {price && (
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="font-medium text-foreground">{price}</span> {unit}
          </p>
        )}
      </div>
    </Link>
  );
}

export function CampListCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-2">
      <div className="h-16 w-16 shrink-0 rounded-lg bg-muted animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
        <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/4 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}
