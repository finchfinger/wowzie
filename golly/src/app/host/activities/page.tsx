"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

type HostActivity = {
  id: string;
  name: string;
  listing_type?: string | null;
  start_time?: string | null;
  capacity?: number | null;
  is_published?: boolean | null;
  is_active?: boolean | null;
  created_at?: string | null;
  slug?: string | null;
};

const formatDate = (iso?: string | null) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const listingTypeLabel = (type?: string | null) => {
  if (!type) return "Camp";
  if (type === "class") return "Class";
  if (type === "series") return "Series";
  return "Camp";
};

export default function HostActivitiesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<HostActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace("/");
      return;
    }

    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from("camps")
        .select("id, name, listing_type, start_time, capacity, is_published, is_active, created_at, slug")
        .eq("host_id", user.id)
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (dbError) {
        setError("Could not load activities.");
        setLoading(false);
        return;
      }

      setActivities((data || []) as HostActivity[]);
      setLoading(false);
    };

    void load();
    return () => { isMounted = false; };
  }, [user, router]);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Activities
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All camps, classes, and series you&apos;ve created.
          </p>
        </div>
        <Link
          href="/host/activities/new"
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-opacity"
        >
          + New activity
        </Link>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {!loading && !error && activities.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            You haven&apos;t created any activities yet.
          </p>
          <Link
            href="/host/activities/new"
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create your first activity
          </Link>
        </div>
      )}

      {!loading && !error && activities.length > 0 && (
        <div className="space-y-2">
          {activities.map((activity) => {
            const published = activity.is_published && activity.is_active;
            const typeLabel = listingTypeLabel(activity.listing_type);
            const dateLabel = formatDate(activity.start_time);

            return (
              <button
                key={activity.id}
                type="button"
                onClick={() => router.push(`/host/activities/${activity.id}`)}
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3 hover:bg-muted/40 transition-colors text-left"
              >
                {/* Left: name + meta */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {activity.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {typeLabel}
                      {dateLabel ? ` · ${dateLabel}` : ""}
                      {typeof activity.capacity === "number"
                        ? ` · ${activity.capacity} spots`
                        : ""}
                    </p>
                  </div>
                </div>

                {/* Right: status pill + arrow */}
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      published
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {published ? "Published" : "Draft"}
                  </span>
                  <span className="text-muted-foreground text-xs">&rsaquo;</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}
