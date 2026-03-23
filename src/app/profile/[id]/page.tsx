"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ActivityListItem } from "@/components/ActivityListItem";

/* ── Types ── */

type Profile = {
  id: string;
  legal_name: string | null;
  preferred_first_name: string | null;
  email: string | null;
  city: string | null;
  about: string | null;
  avatar_url: string | null;
};

type UpcomingActivity = {
  id: string;
  title: string;
  timeLabel: string;
  heroImageUrl: string | null;
  slug: string | null;
};

/* ── Helpers ── */

function formatActivityTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} at ${time}`;
}

/* ── Main page ── */

export default function ProfilePage() {
  const { id: profileIdParam } = useParams<{ id: string }>();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [upcomingActivities, setUpcomingActivities] = useState<UpcomingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"date" | "alpha">("date");

  const isOwnProfile = !!(currentUserId && profile && currentUserId === profile.id);

  /* ── Auth ── */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  /* ── Load profile ── */
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);

      const targetId = profileIdParam || currentUserId;
      if (!targetId) { setError("Sign in to view your profile."); setLoading(false); return; }

      try {
        let profileRow: Profile | null = null;

        // Always fetch auth user first so we can fall back to metadata if needed
        const { data: authData } = await supabase.auth.getUser();
        const isOwnId = authData?.user?.id === targetId;

        const { data: pRow, error: pErr } = await supabase
          .from("profiles")
          .select("id, legal_name, preferred_first_name, email, city, about, avatar_url")
          .eq("id", targetId)
          .maybeSingle();

        if (pRow) {
          profileRow = pRow as unknown as Profile;
        } else {
          if (pErr) console.warn("[profile] SELECT error:", pErr.message);

          if (isOwnId && authData?.user) {
            // Build profile from auth metadata so the page always loads for own profile
            const meta = authData.user.user_metadata ?? {};
            const legalName = [meta.first_name, meta.last_name].filter(Boolean).join(" ") || null;
            profileRow = {
              id: targetId,
              legal_name: legalName,
              preferred_first_name: (meta.first_name as string) || null,
              email: authData.user.email ?? null,
              city: null,
              about: null,
            };
            // Best-effort save to DB — don't block page load on this
            supabase.from("profiles").upsert(
              { id: targetId, email: authData.user.email ?? null, legal_name: legalName, preferred_first_name: (meta.first_name as string) || null },
              { onConflict: "id" },
            ).then(({ error: e }) => { if (e) console.warn("[profile] upsert error:", e.message); });
          }
        }

        if (!isMounted) return;
        if (!profileRow) { setError("Profile not found."); setLoading(false); return; }
        setProfile(profileRow);

        // Upcoming activities — query bookings directly with camp join
        try {
          const { data: bData } = await supabase
            .from("bookings")
            .select("id, camps:camp_id(id, name, slug, hero_image_url, image_url, start_time, meta)")
            .eq("user_id", profileRow.id)
            .in("status", ["confirmed", "pending"])
            .order("created_at", { ascending: false })
            .limit(20);

          if (isMounted && bData) {
            const now = new Date();
            type WithMs = UpcomingActivity & { _ms: number };
            const mapped = (bData as any[])
              .map((row): WithMs | null => {
                const camp = row.camps;
                if (!camp) return null;
                // Pick start time: prefer start_time, fall back to first session
                const startIso: string | null =
                  camp.start_time ??
                  (camp.meta?.campSessions?.[0]?.startDate
                    ? camp.meta.campSessions[0].startDate + "T" + (camp.meta.campSessions[0].startTime ?? "09:00:00")
                    : null);
                if (!startIso) return null;
                const startDate = new Date(startIso);
                if (startDate < now) return null; // skip past activities
                return {
                  _ms: startDate.getTime(),
                  id: row.id,
                  title: camp.name ?? "Activity",
                  timeLabel: formatActivityTime(startIso),
                  heroImageUrl: camp.hero_image_url ?? camp.image_url ?? null,
                  slug: camp.slug ?? null,
                };
              })
              .filter((x): x is WithMs => x !== null)
              .sort((a, b) => a._ms - b._ms)
              .map(({ _ms: _ignored, ...rest }) => rest) as UpcomingActivity[];

            setUpcomingActivities(mapped);
          }
        } catch { setUpcomingActivities([]); }

        setLoading(false);
      } catch {
        if (isMounted) { setError("Something went wrong."); setLoading(false); }
      }
    };

    if (profileIdParam || currentUserId) void load();
    return () => { isMounted = false; };
  }, [profileIdParam, currentUserId]);

  /* ── Filtered / sorted activities ── */
  const filteredActivities = upcomingActivities
    .filter((a) => a.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sort === "alpha" ? a.title.localeCompare(b.title) : 0 // date order already from DB
    );

  /* ── Loading / error states ── */
  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 text-sm text-muted-foreground animate-pulse">
        Loading profile…
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error || "Profile not found."}
        </div>
      </main>
    );
  }

  const displayName = profile.legal_name || profile.preferred_first_name || "Parent";
  const aboutText = profile.about || null;

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 lg:py-10 space-y-5">

      {/* ── Profile header ── */}
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="h-16 w-16 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center text-2xl font-semibold text-muted-foreground">
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
            : displayName.charAt(0).toUpperCase()
          }
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{displayName}</h1>
      </div>

      {/* ── About card ── */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-base font-semibold text-foreground">About</h2>
          {isOwnProfile && (
            <Link
              href="/settings"
              className="shrink-0 rounded-lg border border-border bg-transparent px-3 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              Edit
            </Link>
          )}
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {aboutText || "No bio yet."}
        </p>
      </div>

      {/* ── Upcoming activities card ── */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground mb-4">Upcoming activities</h2>

        {/* Search + sort row */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-border bg-muted/40 pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <line x1="21" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="3" y2="18" />
            </svg>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "date" | "alpha")}
              className="text-sm text-foreground bg-transparent border-none outline-none cursor-pointer"
            >
              <option value="date">By date</option>
              <option value="alpha">Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Activity list */}
        {filteredActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            {search ? "No matching activities." : "No upcoming activities."}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {filteredActivities.map((a) => (
              <ActivityListItem
                key={a.id}
                title={a.title}
                timeLabel={a.timeLabel}
                heroImageUrl={a.heroImageUrl}
                slug={a.slug}
                onMenuClick={isOwnProfile ? () => {} : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Actions (non-own profile) ── */}
      {!isOwnProfile && (
        <div className="flex gap-3">
          <Link
            href={`/messages?to=${encodeURIComponent(profile.id)}`}
            className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground text-center hover:bg-accent transition-colors"
          >
            Message {profile.preferred_first_name || profile.legal_name || "parent"}
          </Link>
        </div>
      )}
    </main>
  );
}
