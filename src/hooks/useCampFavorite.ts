// src/hooks/useCampFavorite.ts
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type CampFavoriteState = {
  isFavorite: boolean;
  favoriteLoading: boolean;
  toggleFavorite: () => Promise<void>;
};

export function useCampFavorite(campId: string | null): CampFavoriteState {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // Load initial favorite state whenever campId changes
  useEffect(() => {
    if (!campId) return;

    let cancelled = false;

    const loadFavorite = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) return;

      const userId = userData.user.id;

      const { data, error } = await supabase
        .from("camp_favorites")
        .select("id")
        .eq("user_id", userId)
        .eq("camp_id", campId)
        .maybeSingle();

      if (error) {
        console.error("Error loading favorite state:", error);
        return;
      }

      if (!cancelled) {
        setIsFavorite(!!data);
      }
    };

    loadFavorite();

    return () => {
      cancelled = true;
    };
  }, [campId]);

  const toggleFavorite = async () => {
    if (!campId) return;
    if (favoriteLoading) return; // prevent double clicks while busy

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      // later: show sign-in modal
      return;
    }

    const userId = userData.user.id;

    setFavoriteLoading(true);

    try {
      if (!isFavorite) {
        // Add favorite
        const { error } = await supabase
          .from("camp_favorites")
          .insert({ user_id: userId, camp_id: campId });

        if (error) {
          console.error("Error adding favorite:", error);
        } else {
          setIsFavorite(true);
        }
      } else {
        // Remove favorite
        const { error } = await supabase
          .from("camp_favorites")
          .delete()
          .eq("user_id", userId)
          .eq("camp_id", campId);

        if (error) {
          console.error("Error removing favorite:", error);
        } else {
          setIsFavorite(false);
        }
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
    } finally {
      setFavoriteLoading(false);
    }
  };

  return { isFavorite, favoriteLoading, toggleFavorite };
}
