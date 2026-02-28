"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { CampGrid } from "@/components/CampGrid";
import type { Camp } from "@/components/CampCard";

export default function WishlistPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [camps, setCamps] = useState<Camp[]>([]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);

      /* favorites = rows in a "favorites" table linking user_id → camp_id */
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

      {!user && !loading && (
        <div className="rounded-xl p-8 text-center text-sm text-muted-foreground">
          Please sign in to see your wishlist.
        </div>
      )}

      {loading && (
        <div className="rounded-xl p-8 text-center text-sm text-muted-foreground">
          Loading your wishlist...
        </div>
      )}

      {!loading && user && camps.length === 0 && (
        <div className="rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            You haven&apos;t saved any activities yet.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Explore activities
          </Link>
        </div>
      )}

      {!loading && camps.length > 0 && <CampGrid camps={camps} />}
    </main>
  );
}
