"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { getPriceUnit } from "@/lib/pricing";
import type { Camp } from "./CampCard";

// ─── Helpers (same logic as CampVerticalCard) ──────────────────────────────

function resolveImage(camp: Camp): string | null {
  if (camp.hero_image_url) return camp.hero_image_url;
  if (Array.isArray(camp.image_urls) && camp.image_urls.length > 0) return camp.image_urls[0];
  if (camp.image_url) return camp.image_url;
  return null;
}

function resolvePrice(camp: Camp): string | null {
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
}

function resolveDate(camp: Camp): string | null {
  const fmt = (iso: string) => {
    const d = new Date(iso.includes("T") ? iso : iso + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  };
  if (camp.start_time) return `Starting ${fmt(camp.start_time)}`;
  if (camp.session_start) return `Starting ${fmt(camp.session_start)}`;
  if (typeof camp.meta?.dateLabel === "string" && camp.meta.dateLabel.trim())
    return camp.meta.dateLabel.trim();
  return null;
}

// ─── Card ──────────────────────────────────────────────────────────────────

const MONO_GREEN = "#6BCB77";

function ExploreMoreCard({ camp }: { camp: Camp }) {
  const image = resolveImage(camp)!;
  const price = resolvePrice(camp);
  const unit = getPriceUnit(camp);
  const dateStr = resolveDate(camp);

  return (
    <Link
      href={`/activity/${camp.short_id ?? camp.slug}`}
      className="group block focus:outline-none"
      aria-label={`View ${camp.name}`}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg">
        <Image
          src={image}
          alt={camp.name}
          fill
          sizes="(max-width: 768px) 50vw, 17vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          style={{ filter: "grayscale(1) contrast(1.15)", mixBlendMode: "multiply" }}
        />
      </div>

      <div className="mt-2 flex flex-col gap-0.5">
        {dateStr && (
          <p style={{ fontSize: 10, lineHeight: "14px", color: "rgba(0,0,0,0.5)" }}>
            {dateStr}
          </p>
        )}
        <p
          className="line-clamp-2"
          style={{ fontSize: 13, lineHeight: "18px", fontWeight: 700, color: "rgba(0,0,0,0.85)" }}
        >
          {camp.name}
        </p>
        {price && (
          <p style={{ fontSize: 12, lineHeight: "16px", color: "rgba(0,0,0,0.5)" }}>
            {price} {unit}
          </p>
        )}
      </div>
    </Link>
  );
}

// ─── Section ───────────────────────────────────────────────────────────────

type ExploreMoreSectionProps = {
  camps: Camp[];
  title?: string;
  exploreAllHref?: string;
  variant: "mono" | "color";
};

export function ExploreMoreSection({
  camps,
  title = "Popular activities near you",
  exploreAllHref = "/search",
  variant,
}: ExploreMoreSectionProps) {
  const withImages = camps.filter((c) => resolveImage(c) !== null);
  if (withImages.length === 0) return null;
  const isMono = variant === "mono";

  return (
    <section style={{ background: isMono ? MONO_GREEN : "#fff", paddingTop: 40, paddingBottom: 48 }}>
      <div className="page-grid">
        <div className="span-12-center">
          <div className="flex items-center justify-between mb-5">
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "rgba(0,0,0,0.85)",
              }}
            >
              {title}
            </h2>
            <Link
              href={exploreAllHref}
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "rgba(0,0,0,0.45)",
              }}
            >
              Explore all
            </Link>
          </div>

          <div className="grid grid-cols-6 gap-4">
            {withImages.slice(0, 6).map((camp) => (
              <ExploreMoreCard key={camp.id} camp={camp} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
