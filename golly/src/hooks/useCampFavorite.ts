"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CampFavoriteState = {
  isFavorite: boolean;
  favoriteLoading: boolean;
  toggleFavorite: () => Promise<void>;
};

export function useCampFavorite(campId: string | null): CampFavoriteState {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(true);

  useEffect(() => {
    if (!campId) return;

    let cancelled = false;

    const loadFavorite = async () => {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData.user) {
        if (!cancelled) setFavoriteLoading(false);
        return;
      }

      const userId = userData.user.id;

      const { data, error } = await supabase
        .from("camp_favorites")
        .select("id")
        .eq("user_id", userId)
        .eq("camp_id", campId)
        .maybeSingle();

      if (error) {
        console.error("[useCampFavorite] load failed:", error.message, error.code, error.details);
        if (!cancelled) setFavoriteLoading(false);
        return;
      }

      if (!cancelled) {
        setIsFavorite(!!data);
        setFavoriteLoading(false);
      }
    };

    loadFavorite();

    return () => {
      cancelled = true;
    };
  }, [campId]);

  const toggleFavorite = async () => {
    if (!campId) return;
    if (favoriteLoading) return;

    const { data: userData, error: userError } =
      await supabase.auth.getUser();
    if (userError || !userData.user) return;

    const userId = userData.user.id;

    setFavoriteLoading(true);

    try {
      if (!isFavorite) {
        const { error } = await supabase
          .from("camp_favorites")
          .upsert({ user_id: userId, camp_id: campId }, { ignoreDuplicates: true });

        if (error) {
          console.error("[useCampFavorite] insert failed:", error.message, error.code, error.details, error.hint);
        } else {
          setIsFavorite(true);
        }
      } else {
        const { error } = await supabase
          .from("camp_favorites")
          .delete()
          .eq("user_id", userId)
          .eq("camp_id", campId);

        if (error) {
          console.error("[useCampFavorite] delete failed:", error.message, error.code, error.details, error.hint);
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
