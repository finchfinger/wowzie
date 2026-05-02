"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CampCard, CampCardSkeleton } from "@/components/CampCard";
import type { Camp } from "@/components/CampCard";

type OrgMeta = {
  organizationName?: string;
  organizationSlug?: string;
  organizationDescription?: string;
  organizationLogo?: string;
  organizationLocation?: string;
  externalUrl?: string;
  external_url?: string;
  partnerListing?: boolean;
};

export default function OrgPage() {
  const { slug } = useParams<{ slug: string }>();
  const [camps, setCamps] = useState<Camp[]>([]);
  const [org, setOrg] = useState<OrgMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError(null);

      // Fetch all published camps for this org slug
      const { data, error: err } = await supabase
        .from("camps")
        .select(`
          id, slug, name, description,
          image_url, hero_image_url, image_urls,
          price_cents, price_unit, listing_type,
          schedule_days, meta, external_url,
          session_start, session_end, start_time, end_time,
          min_age, max_age
        `)
        .eq("is_published", true)
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .order("session_start", { ascending: true });

      if (!alive) return;
      if (err) { setError("Couldn't load this organization."); setLoading(false); return; }

      // Filter to camps whose meta.organizationSlug matches
      const matched = ((data ?? []) as any[]).filter(
        (c) => (c.meta as OrgMeta)?.organizationSlug === slug
      );

      if (matched.length === 0) { setError("Organization not found."); setLoading(false); return; }

      const firstMeta = matched[0].meta as OrgMeta;
      setOrg(firstMeta);
      setCamps(matched as Camp[]);
      setLoading(false);
    };
    void load();
    return () => { alive = false; };
  }, [slug]);

  /* ── Loading ── */
  if (loading) {
    return (
      <main>
        <div className="page-container py-10">
          <div className="page-grid">
            <div className="span-10-center space-y-8">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-muted animate-pulse" />
                <div className="space-y-2">
                  <div className="h-6 w-48 rounded-lg bg-muted animate-pulse" />
                  <div className="h-4 w-32 rounded-lg bg-muted animate-pulse" />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <CampCardSkeleton key={i} />)}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ── Error ── */
  if (error || !org) {
    return (
      <main>
        <div className="page-container py-10">
          <div className="page-grid">
            <div className="span-10-center">
              <p className="text-sm text-muted-foreground">{error ?? "Organization not found."}</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const orgName = org.organizationName ?? "Organization";
  const orgLogo = org.organizationLogo ?? null;
  const orgDescription = org.organizationDescription ?? null;
  const orgLocation = org.organizationLocation ?? null;
  const orgWebsite = org.externalUrl ?? org.external_url ?? null;
  const initial = orgName.charAt(0).toUpperCase();

  return (
    <main>
      <div className="page-container py-10">
        <div className="page-grid">
          <div className="span-10-center space-y-8">

            {/* ── Org header ── */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
              {/* Logo / monogram */}
              {orgLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={orgLogo}
                  alt={orgName}
                  className="h-16 w-16 rounded-2xl object-cover shrink-0"
                />
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary shrink-0">
                  {initial}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-semibold text-foreground tracking-tight">{orgName}</h1>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  {orgLocation && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <span className="material-symbols-rounded select-none" style={{ fontSize: 14 }}>location_on</span>
                      {orgLocation}
                    </span>
                  )}
                  {orgWebsite && (
                    <a
                      href={orgWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <span className="material-symbols-rounded select-none" style={{ fontSize: 14 }}>open_in_new</span>
                      Visit website
                    </a>
                  )}
                </div>

                {orgDescription && (
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                    {orgDescription}
                  </p>
                )}
              </div>
            </div>

            {/* ── Divider ── */}
            <hr className="border-border" />

            {/* ── Listings ── */}
            <div>
              <h2 className="text-base font-semibold text-foreground mb-5">
                {camps.length} {camps.length === 1 ? "listing" : "listings"}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
                {camps.map((camp) => (
                  <CampCard key={camp.id} camp={camp} />
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
