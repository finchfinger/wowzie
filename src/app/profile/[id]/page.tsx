"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SortDropdown } from "@/components/ui/SortDropdown";
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
  wowzi_managed?: boolean;
  is_claimed?: boolean;
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
  short_id: string | null;
};

/* ── Helpers ────────────────────────────────────────────── */

function formatActivityTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} at ${time}`;
}

/* ── Main page ──────────────────────────────────────────── */

export default function ProfilePage() {
  const { id: profileIdParam } = useParams<{ id: string }>();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hostProfile, setHostProfile] = useState<HostProfile | null>(null);
  const [upcomingActivities, setUpcomingActivities] = useState<UpcomingActivity[]>([]);
  const [hostedCount, setHostedCount] = useState<number>(0);
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

        // Try API route first (bypasses RLS for public host profiles)
        const apiRes = await fetch(`/api/profiles/${targetId}`);
        if (apiRes.ok) {
          profileRow = await apiRes.json() as Profile;
        }

        if (!profileRow) {
          const { data: pRow, error: pErr } = await supabase
            .from("profiles")
            .select("id, legal_name, preferred_first_name, email, city, about, avatar_url")
            .eq("id", targetId)
            .maybeSingle();
          if (pRow) profileRow = pRow as unknown as Profile;
          else if (pErr) console.warn("[profile] SELECT error:", pErr.message);
        }

        // Fallback: synthesize own profile from auth metadata if not in DB yet
        if (!profileRow && isOwnId && authData?.user) {
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
            .select("id, camps:camp_id(id, name, slug, short_id, hero_image_url, image_url, start_time, meta)")
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
                  short_id: camp.short_id ?? null,
                };
              })
              .filter((x): x is WithMs => x !== null)
              .sort((a, b) => a._ms - b._ms)
              .map(({ _ms: _ignored, ...rest }) => rest) as UpcomingActivity[];
            setUpcomingActivities(mapped);
          }
        } catch { setUpcomingActivities([]); }

        /* Hosted camps (for host/org profiles) */
        try {
          const { data: hostedData } = await supabase
            .from("camps")
            .select("id, name, slug, short_id, hero_image_url, image_url, start_time, meta")
            .eq("host_id", targetId)
            .eq("is_published", true)
            .limit(20);

          if (isMounted && hostedData) setHostedCount(hostedData.length);
          if (isMounted && hostedData && hostedData.length > 0) {
            const hostedMapped = (hostedData as any[]).map((camp): UpcomingActivity => ({
              id: camp.id,
              title: camp.name ?? "Activity",
              timeLabel: camp.meta?.dateLabel ?? (camp.start_time ? formatActivityTime(camp.start_time) : ""),
              heroImageUrl: camp.hero_image_url ?? camp.image_url ?? null,
              slug: camp.slug ?? null,
              short_id: camp.short_id ?? null,
            }));
            setUpcomingActivities((prev) => {
              const ids = new Set(prev.map((a) => a.id));
              return [...prev, ...hostedMapped.filter((a) => !ids.has(a.id))];
            });
          }
        } catch { /* ignore */ }

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

  /* ── Info rows (description list) ── */
  const infoRows: { icon: string; label: string }[] = [];
  if (profile?.city) infoRows.push({ icon: "location_on", label: profile.city });
  if (hostProfile?.created_at) infoRows.push({ icon: "calendar_today", label: `Hosting since ${new Date(hostProfile.created_at).getFullYear()}` });
  if (hostedCount > 0) infoRows.push({ icon: "camping", label: `${hostedCount} ${hostedCount === 1 ? "activity" : "activities"} hosted` });

  /* ── Designations (Tags) ── */
  const designations: string[] = [];
  if ((profile?.wowzi_managed && profile.is_claimed) || hostProfile?.host_status === "approved") {
    designations.push("Identity verified");
  }
  if (hostProfile?.host_status === "approved") {
    designations.push("Superhost");
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

  const displayName: string = (profile.preferred_first_name === profile.legal_name
    ? profile.legal_name
    : (profile.preferred_first_name && profile.legal_name
      ? `${profile.preferred_first_name} ${profile.legal_name.split(" ").slice(1).join(" ")}`.trim() || profile.legal_name
      : profile.legal_name || profile.preferred_first_name || "Parent")) ?? "Parent";

  return (
    <main>
      <div className="page-container py-8 lg:py-10">
        <div className="page-grid">
          <div className="span-10-center space-y-4">

            {/* ── Header ── */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <PageHeader
              title={displayName}
              media={
                isOwnProfile ? (
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="group relative block shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Change profile photo"
                  >
                    <UserAvatar name={displayName} avatarUrl={profile.avatar_url ?? undefined} size={52} />
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploadingAvatar
                        ? <span className="material-symbols-outlined text-white text-[18px] animate-spin">progress_activity</span>
                        : <span className="material-symbols-outlined text-white text-[18px]">photo_camera</span>}
                    </span>
                  </button>
                ) : (
                  <UserAvatar name={displayName} avatarUrl={profile.avatar_url ?? undefined} size={52} />
                )
              }
              action={isOwnProfile ? { label: "Edit", href: "/settings" } : undefined}
            />

            {/* ── About card ── */}
            <div className="rounded-card bg-card p-5 sm:p-6 space-y-4">
              <h2 className="text-base font-semibold text-foreground">About</h2>

              <p className="text-sm leading-relaxed text-muted-foreground">
                {profile.about || "No bio yet."}
              </p>

              {infoRows.length > 0 && (
                <dl className="space-y-2">
                  {infoRows.map((row) => (
                    <div key={row.label} className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-muted-foreground select-none shrink-0" style={{ fontSize: 16 }} aria-hidden>{row.icon}</span>
                      <dd className="text-sm text-foreground">{row.label}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {designations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {designations.map((d) => <Tag key={d} label={d} />)}
                </div>
              )}
            </div>

            {/* ── Upcoming activities card ── */}
            <div className="rounded-card bg-card p-5 sm:p-6">
              <h2 className="text-base font-semibold text-foreground mb-4">Upcoming activities</h2>

              {/* Search + sort */}
              <div className="flex items-center gap-3 mb-4">
                <Input
                  type="text"
                  placeholder="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1"
                />
                <SortDropdown
                  options={[
                    { value: "date", label: "By date" },
                    { value: "alpha", label: "Alphabetical" },
                  ]}
                  value={sort}
                  onChange={(v) => setSort(v as "date" | "alpha")}
                />
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
                      short_id={a.short_id}
                      onMenuClick={isOwnProfile ? () => router.push(`/activity/${a.short_id}`) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Claim CTA (unclaimed wowzi-managed org) ── */}
            {!isOwnProfile && profile.wowzi_managed && !profile.is_claimed && (
              <Alert
                tone="warning"
                icon="lock_open"
                action={{
                  label: "Claim this listing",
                  href: `mailto:hey@heywowzi.com?subject=${encodeURIComponent(`Claim listing: ${displayName}`)}`,
                }}
              >
                Is this your organization? This listing was created by Wowzi on your behalf.
              </Alert>
            )}

            {/* ── Message button (other non-org profiles) ── */}
            {!isOwnProfile && !(profile.wowzi_managed && !profile.is_claimed) && (
              <Button asChild variant="outline" className="w-full">
                <Link href={`/messages?to=${encodeURIComponent(profile.id)}`}>
                  Message {profile.preferred_first_name || profile.legal_name || "parent"}
                </Link>
              </Button>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}
