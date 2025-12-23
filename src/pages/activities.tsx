// src/pages/activities.tsx
import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { CampCard } from "../components/CampCard";
import type { Camp } from "../components/CampCard";

// You can later move these into env vars; for now we’ll reuse your old supabase.js values
const SUPABASE_URL = "https://fzdhexysoleaegzwtryf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6ZGhleHlzb2xlYWVnend0cnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MzE2MDYsImV4cCI6MjA3ODEwNzYwNn0.kEU-hZW2TJ2sNz_TDPo_lNu0OYu6GKfn1t5Sv-UVj6U";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FAVORITES_KEY = "wowzie_favorites";

function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeFavorites(favs: string[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  } catch {
    // ignore
  }
}

type CampRow = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  location: string | null;
  image_url: string | null;
  price_cents: number | null;
  status: string | null;
  created_at: string;
};

export const ActivitiesPage: React.FC = () => {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavoritesState] = useState<string[]>(() => readFavorites());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from("camps")
        .select("id, slug, name, description, location, image_url, price_cents, status, created_at")
        .order("created_at", { ascending: false });

      if (dbError) {
        console.error("Error loading camps:", dbError);
        setError("We couldn’t load camps right now. Please try again.");
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as CampRow[];

      // only show approved + require slug (CampCard expects a slug string)
      const visible = rows.filter((c) => (c.status || "").trim() === "approved" && !!c.slug);

      // dedupe by slug
      const uniqueBySlug = Object.values(
        visible.reduce<Record<string, CampRow>>((acc, camp) => {
          const key = String(camp.slug);
          if (!acc[key]) acc[key] = camp;
          return acc;
        }, {})
      );

      // map to Camp type expected by CampCard
      const mapped: Camp[] = uniqueBySlug.map((c) => ({
        id: String(c.id),
        slug: String(c.slug),
        name: String(c.name ?? ""),
        description: c.description ?? null,
        image_url: c.image_url ?? null,
        price_cents: c.price_cents ?? null,
        meta: { location: c.location ?? null },
      }));

      setCamps(mapped);
      setLoading(false);
    };

    void load();
  }, []);

  const handleToggleFavorite = (id: string) => {
    setFavoritesState((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      writeFavorites(next);
      return next;
    });
  };

  return (
    <div className="py-6">
      {/* Top copy from old index.html */}
      <section className="mb-8">
        <h1 className="text-4xl font-bold text-blue-600 mb-3">Welcome to Wowzie!</h1>
        <p className="text-lg text-gray-700 mb-8">
          Discover camps, classes, and experiences for kids in your city.
        </p>

        <h2 className="text-2xl font-semibold mb-3">What do parents want from a camp?</h2>
        <ul className="list-disc ml-6 mb-6 space-y-1 text-gray-800">
          <li>Safety first</li>
          <li>Engaging experiences</li>
          <li>Easy booking and payments</li>
        </ul>
      </section>

      {/* Camps grid */}
      <section>
        {loading && <p className="text-sm text-gray-500">Loading camps…</p>}

        {error && <p className="text-sm text-rose-600 mb-4">{error}</p>}

        {!loading && !error && camps.length === 0 && (
          <p className="text-sm text-gray-600">No approved camps yet. Check back soon.</p>
        )}

        {camps.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 items-stretch">
            {camps.map((camp) => (
              <CampCard
                key={camp.id}
                camp={camp}
                isFavorite={favorites.includes(camp.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ActivitiesPage;
