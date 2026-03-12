"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { CampGrid } from "@/components/CampGrid";
import { CampCardSkeleton } from "@/components/ui/skeleton";
import type { Camp } from "@/components/CampCard";

export default function WishlistPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [camps, setCamps] = useState<Camp[]>([]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);

      const { data: favRows, error: favErr } = await supabase
        .from("camp_favorites")
        .select("camp_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (favErr || !favRows?.length) {
        setCamps([]);
        setLoading(false);
        return;
      }

      const campIds = favRows.map((r: any) => r.camp_id);
      const { data: campData } = await supabase
        .from("camps")
        .select("id, name, slug, image_url, image_urls, hero_image_url, price_cents, price_unit, listing_type, meta")
        .in("id", campIds);

      setCamps(
        (campData || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug || c.id,
          image_url: c.image_url || null,
          image_urls: c.image_urls || null,
          hero_image_url: c.hero_image_url || null,
          price_cents: c.price_cents ?? null,
          price_unit: c.price_unit || null,
          listing_type: c.listing_type || null,
          meta: c.meta || null,
        }))
      );
      setLoading(false);
    };
    void load();
  }, [user]);

  return (
    <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Wishlist
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Activities you&apos;ve saved for later.
        </p>
      </div>

      {/* Not signed in */}
      {!user && !loading && (
        <div className="rounded-2xl border border-border/50 bg-card px-6 py-14 text-center max-w-sm mx-auto">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Heart className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">Sign in to see your wishlist</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Save your favorite activities and come back to them anytime.
          </p>
          <Link
            href="/?signin=1"
            className="mt-5 inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Sign in
          </Link>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CampCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && user && camps.length === 0 && (
        <div className="rounded-2xl border border-border/50 bg-card px-6 py-14 text-center max-w-sm mx-auto">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Heart className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">Nothing saved yet</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Tap the heart on any activity to save it here for later.
          </p>
          <Link
            href="/search"
            className="mt-5 inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Explore activities
          </Link>
        </div>
      )}

      {/* Results */}
      {!loading && camps.length > 0 && (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {camps.length} saved {camps.length === 1 ? "activity" : "activities"}
          </p>
          <CampGrid camps={camps} />
        </>
      )}
    </main>
  );
}
