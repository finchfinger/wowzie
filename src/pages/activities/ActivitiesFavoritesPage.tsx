import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { CampGrid } from "../../components/CampGrid";
import type { Camp } from "../../components/CampCard";

type FavoriteRow = {
  camp_id: string;
};

export const ActivitiesFavoritesPage: React.FC = () => {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFavorites = async () => {
      setLoading(true);
      setError(null);

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        setError("Sign in to see your favorites.");
        setLoading(false);
        return;
      }

      const userId = userData.user.id;

      // 1) get camp ids this user has favorited
      const { data: favRows, error: favError } = await supabase
        .from("camp_favorites")
        .select("camp_id")
        .eq("user_id", userId);

      if (favError) {
        console.error("Error loading favorites:", favError);
        setError("We couldn’t load your favorites.");
        setLoading(false);
        return;
      }

      const campIds = (favRows || []).map((row: FavoriteRow) => row.camp_id);

      if (campIds.length === 0) {
        setCamps([]);
        setLoading(false);
        return;
      }

      // 2) load those camps
      const { data: campRows, error: campsError } = await supabase
        .from("camps")
        .select(
          "id, slug, name, description, location, image_url, price_cents, meta"
        )
        .in("id", campIds);

      if (campsError) {
        console.error("Error loading favorite camps:", campsError);
        setError("We couldn’t load your favorites.");
        setLoading(false);
        return;
      }

      setCamps((campRows || []) as Camp[]);
      setLoading(false);
    };

    void loadFavorites();
  }, []);

  if (loading) {
    return (
      <div className="py-10 text-sm text-gray-600">Loading favorites…</div>
    );
  }

  if (error) {
    return (
      <div className="py-10 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (camps.length === 0) {
    return (
      <div className="py-10 text-sm text-gray-600">
        You don’t have any favorites yet. Tap the heart on an activity to save
        it here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Saved activities
          </h1>
          <p className="mt-1 text-xs text-gray-600">
            Camps and classes you’ve favorited.
          </p>
        </div>
      </header>

      <CampGrid camps={camps} />
    </div>
  );
};

export default ActivitiesFavoritesPage;
