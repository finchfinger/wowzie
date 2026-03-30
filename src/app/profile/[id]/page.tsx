"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ActivityListItem } from "@/components/ActivityListItem";
import { ActionsMenu } from "@/components/ui/ActionsMenu";

/* ── Types ─────────────────────────────────────────────── */

type Profile = {
  id: string;
  legal_name: string | null;
  preferred_first_name: string | null;
  email: string | null;
  city: string | null;
  about: string | null;
  avatar_url: string | null;
};

type HostProfile = {
  host_status: string | null;
  created_at: string | null;
};

type UpcomingActivity = {
  id: string;
  title: string;
  timeLabel: string;
  heroImageUrl: string | null;
  slug: string | null;
};

/* ── Helpers ────────────────────────────────────────────── */

function formatActivityTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} at ${time}`;
}

/* ── Badge chip ─────────────────────────────────────────── */

function Badge({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
      <span className="material-symbols-rounded text-[14px] leading-none">{icon}</span>
      {label}
    </span>
  );
}

/* ── Main page ──────────────────────────────────────────── */

export default function ProfilePage() {
  const { id: profileIdParam } = useParams<{ id: string }>();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hostProfile, setHostProfile] = useState<HostProfile | null>(null);
  const [upcomingActivities, setUpcomingActivities] = useState<UpcomingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"date" | "alpha">("date");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
            const meta = authData.user.user_metadata ?? {};
            const legalName = [meta.first_name, meta.last_name].filter(Boolean).join(" ") || null;
            profileRow = {
              id: targetId,
              legal_name: legalName,
              preferred_first_name: (meta.first_name as string) || null,
              email: authData.user.email ?? null,
              city: null,
              about: null,
              avatar_url: null,
            };
            supabase.from("profiles").upsert(
              { id: targetId, email: authData.user.email ?? null, legal_name: legalName, preferred_first_name: (meta.first_name as string) || null },
              { onConflict: "id" },
            ).then(({ error: e }) => { if (e) console.warn("[profile] upsert error:", e.message); });
          }
        }

        if (!isMounted) return;
        if (!profileRow) { setError("Profile not found."); setLoading(false); return; }
        setProfile(profileRow);

        /* Host profile */
        const { data: hRow } = await supabase
          .from("host_profiles")
          .select("host_status, created_at")
          .eq("user_id", targetId)
          .maybeSingle();
        if (isMounted && hRow) setHostProfile(hRow as HostProfile);

        /* Upcoming activities */
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
                const startIso: string | null =
                  camp.start_time ??
                  (camp.meta?.campSessions?.[0]?.startDate
                    ? camp.meta.campSessions[0].startDate + "T" + (camp.meta.campSessions[0].startTime ?? "09:00:00")
                    : null);
                if (!startIso) return null;
                const startDate = new Date(startIso);
                if (startDate < now) return null;
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
    .sort((a, b) => sort === "alpha" ? a.title.localeCompare(b.title) : 0);

  /* ── Avatar upload ── */
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${profile.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", profile.id);
      setProfile((p) => p ? { ...p, avatar_url: publicUrl } : p);
    } catch (err) {
      console.error("[avatar upload]", err);
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  /* ── Badges ── */
  const badges: { icon: string; label: string }[] = [];
  if (hostProfile?.host_status === "approved") {
    badges.push({ icon: "verified", label: "Superhost" });
    if (hostProfile.created_at) {
      badges.push({ icon: "calendar_today", label: `Host since ${new Date(hostProfile.created_at).getFullYear()}` });
    }
  }

  /* ── Loading / error ── */
  if (loading) {
    return (
      <main>
        <div className="page-container py-10">
          <div className="page-grid">
            <div className="span-8-center text-sm text-muted-foreground animate-pulse">Loading profile…</div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main>
        <div className="page-container py-10">
          <div className="page-grid">
            <div className="span-8-center">
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error || "Profile not found."}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const displayName = profile.preferred_first_name && profile.legal_name
    ? `${profile.preferred_first_name} ${profile.legal_name.split(" ").slice(1).join(" ")}`.trim() || profile.legal_name
    : profile.legal_name || profile.preferred_first_name || "Parent";

  return (
    <main>
      <div className="page-container py-8 lg:py-10">
        <div className="page-grid">
          <div className="span-8-center space-y-4">

            {/* ── Header ── */}
            <div className="flex items-center gap-3">
              {/* Avatar — tappable on own profile */}
              <div className="relative shrink-0">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                {isOwnProfile ? (
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="group relative block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Change profile photo"
                  >
                    <UserAvatar
                      name={displayName}
                      avatarUrl={profile.avatar_url ?? undefined}
                      size={52}
                    />
                    {/* Camera overlay */}
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploadingAvatar ? (
                        <span className="material-symbols-rounded text-white text-[18px] animate-spin">progress_activity</span>
                      ) : (
                        <span className="material-symbols-rounded text-white text-[18px]">photo_camera</span>
                      )}
                    </span>
                  </button>
                ) : (
                  <UserAvatar
                    name={displayName}
                    avatarUrl={profile.avatar_url ?? undefined}
                    size={52}
                  />
                )}
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{displayName}</h1>
            </div>

            {/* ── About card ── */}
            <div className="rounded-2xl bg-card shadow-sm p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
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
                {profile.about || "No bio yet."}
              </p>

              {badges.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {badges.map((b) => (
                    <Badge key={b.label} icon={b.icon} label={b.label} />
                  ))}
                </div>
              )}
            </div>

            {/* ── Upcoming activities card ── */}
            <div className="rounded-2xl bg-card shadow-sm p-5 sm:p-6">
              <h2 className="text-base font-semibold text-foreground mb-4">Upcoming activities</h2>

              {/* Search + sort */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]">search</span>
                  <input
                    type="text"
                    placeholder="Search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-full border border-border bg-muted/40 pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/30"
                  />
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-sm text-muted-foreground">
                  <span className="material-symbols-rounded text-[18px]">filter_list</span>
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

              {/* List */}
              {filteredActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  {search ? "No matching activities." : "No upcoming activities."}
                </p>
              ) : (
                <div className="divide-y divide-border/50">
                  {filteredActivities.map((a) => (
                    <ActivityListItem
                      key={a.id}
                      title={a.title}
                      timeLabel={a.timeLabel}
                      heroImageUrl={a.heroImageUrl}
                      slug={a.slug}
                      onMenuClick={isOwnProfile ? () => router.push(`/camp/${a.slug}`) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Message button (other profiles) ── */}
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

          </div>
        </div>
      </div>
    </main>
  );
}
