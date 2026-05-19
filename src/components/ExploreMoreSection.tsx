"use client";
import React from "react";
import Link from "next/link";
import { CampVerticalCard } from "./CampVerticalCard";
import type { Camp } from "./CampCard";

function resolveImage(camp: Camp): string | null {
  if (camp.hero_image_url) return camp.hero_image_url;
  if (Array.isArray(camp.image_urls) && camp.image_urls.length > 0) return camp.image_urls[0];
  if (camp.image_url) return camp.image_url;
  return null;
}

// ─── Section ───────────────────────────────────────────────────────────────

type ExploreMoreSectionProps = {
  camps: Camp[];
  title?: string;
  exploreAllHref?: string;
};

export function ExploreMoreSection({
  camps,
  title = "Keep exploring",
  exploreAllHref = "/search",
}: ExploreMoreSectionProps) {
  const withImages = camps.filter((c) => resolveImage(c) !== null);
  if (withImages.length === 0) return null;

  return (
    <section style={{ background: "#fff", marginTop: 100, paddingTop: 48, paddingBottom: 48 }}>
      <div className="page-container" style={{ paddingTop: 0 }}>
        <div className="page-grid">
          <div className="span-12">
            <div className="flex items-center justify-between mb-5">
              <h2
                className="flex items-center gap-2"
                style={{ fontSize: 16, fontWeight: 700, color: "rgba(0,0,0,0.85)" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }} aria-hidden>flashlight_on</span>
                {title}
              </h2>
              <Link
                href={exploreAllHref}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "rgba(0,0,0,0.7)",
                  background: "rgba(0,0,0,0.06)",
                  borderRadius: 20,
                  padding: "6px 14px",
                }}
              >
                See more
              </Link>
            </div>

            <div className="grid grid-cols-6 gap-3">
              {withImages.slice(0, 6).map((camp) => (
                <CampVerticalCard key={camp.id} camp={camp} variant="compact" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
