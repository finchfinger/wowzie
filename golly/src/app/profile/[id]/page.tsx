"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type Profile = {
  id: string;
  legal_name: string | null;
  preferred_first_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  about: string | null;
  is_host: boolean | null;
  avatar_url: string | null;
};

type HostProfile = {
  id: string;
  profile_id: string;
  about: string | null;
  instagram_handle: string | null;
  x_handle: string | null;
  youtube_handle: string | null;
  tiktok_handle: string | null;
  website_url: string | null;
  identity_verified: boolean | null;
  supermom_badge: boolean | null;
};

type UpcomingActivity = {
  id: string;
  title: string;
  timeLabel: string;
  heroImageUrl?: string | null;
};

export default function ProfilePage() {
  const { id: profileIdParam } = useParams<{ id: string }>();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hostProfile, setHostProfile] = useState<HostProfile | null>(null);
  const [upcomingActivities, setUpcomingActivities] = useState<UpcomingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = currentUserId && profile && currentUserId === profile.id;

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data.user?.id ?? null);
    };
    void loadUser();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const targetId = profileIdParam || currentUserId;
        if (!targetId) {
          setError("You need to be signed in to view your profile.");
          setLoading(false);
          return;
        }

        const { data: profileRow, error: profileError } = await supabase
          .from("profiles")
          .select("id, legal_name, preferred_first_name, email, phone, city, state, about, is_host, avatar_url")
          .eq("id", targetId)
          .maybeSingle();

        if (profileError || !profileRow) {
          if (!isMounted) return;
          setError("Profile not found.");
          setLoading(false);
          return;
        }

        if (!isMounted) return;
        const p = profileRow as unknown as Profile;
        setProfile(p);

        if (p.is_host) {
          const { data: hostRow } = await supabase
            .from("host_profiles")
            .select("id, profile_id, about, instagram_handle, x_handle, youtube_handle, tiktok_handle, website_url, identity_verified, supermom_badge")
            .eq("profile_id", p.id)
            .maybeSingle();
          if (!isMounted) return;
          if (hostRow) setHostProfile(hostRow as HostProfile);
        }

        // Try to load upcoming activities
        try {
          const { data: bookingsData } = await supabase
            .from("bookings_with_camps_view")
            .select("id, camp_name, start_time, hero_image_url")
            .eq("profile_id", p.id)
            .gt("start_time", new Date().toISOString())
            .order("start_time", { ascending: true })
            .limit(10);

          if (bookingsData && isMounted) {
            setUpcomingActivities(
              bookingsData.map((row: any) => ({
                id: row.id,
                title: row.camp_name,
                timeLabel: new Date(row.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
                heroImageUrl: row.hero_image_url,
              }))
            );
          }
        } catch {
          setUpcomingActivities([]);
        }

        setLoading(false);
      } catch {
        if (!isMounted) return;
        setError("Something went wrong loading this profile.");
        setLoading(false);
      }
    };

    if (profileIdParam || currentUserId) void loadProfile();
    return () => { isMounted = false; };
  }, [profileIdParam, currentUserId]);

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 text-sm text-muted-foreground">
        Loading profile...
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error || "Profile not found."}
        </div>
      </main>
    );
  }

  const displayName = profile.preferred_first_name || profile.legal_name || "Parent";
  const aboutText = hostProfile?.about || profile.about || "This parent has not added a bio yet.";
  const locationPieces = [profile.city, profile.state].filter(Boolean);
  const locationLabel = locationPieces.length > 0 ? locationPieces.join(", ") : null;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          {profile.avatar_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-14 w-14 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-xl font-semibold text-muted-foreground shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            {displayName}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-[11px] mt-1">
            {(hostProfile?.identity_verified || profile.is_host) && (
              <span className="inline-flex items-center rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-foreground ring-1 ring-border">
                Identity verified
              </span>
            )}
            {hostProfile?.supermom_badge && (
              <span className="inline-flex items-center rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-foreground ring-1 ring-border">
                Supermom
              </span>
            )}
            {locationLabel && <span className="text-xs text-muted-foreground">{locationLabel}</span>}
          </div>
        </div>
        </div>

        <div className="flex items-center gap-2">
          {isOwnProfile ? (
            <Link href="/settings">
              <Button variant="outline" size="sm">Edit profile</Button>
            </Link>
          ) : (
            <Link href={`/messages?to=${encodeURIComponent(profile.id)}`}>
              <Button size="sm">
                Message {profile.preferred_first_name || profile.legal_name || "parent"}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* About */}
      <div className="space-y-6 mb-8">
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-1.5">
            About {profile.preferred_first_name || profile.legal_name || "this parent"}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground max-w-3xl">{aboutText}</p>
        </section>

        {hostProfile && (
          <section className="rounded-2xl bg-primary/5 px-4 sm:px-5 py-3.5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-primary">Host profile</h3>
              {isOwnProfile && (
                <Link href="/host/settings" className="text-[11px] font-medium text-primary hover:underline">
                  Edit host settings
                </Link>
              )}
            </div>
            <p className="text-xs text-foreground/70 max-w-3xl mb-2.5">
              Families see this when they view your listings and profile.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground">
              {hostProfile.instagram_handle && <p>Instagram <span className="font-medium">@{hostProfile.instagram_handle}</span></p>}
              {hostProfile.x_handle && <p>X <span className="font-medium">@{hostProfile.x_handle}</span></p>}
              {hostProfile.youtube_handle && <p>YouTube <span className="font-medium">@{hostProfile.youtube_handle}</span></p>}
              {hostProfile.tiktok_handle && <p>TikTok <span className="font-medium">@{hostProfile.tiktok_handle}</span></p>}
              {hostProfile.website_url && <p>Website <span className="font-medium">{hostProfile.website_url}</span></p>}
            </div>
          </section>
        )}
      </div>

      {/* Upcoming */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Upcoming</h2>
        {upcomingActivities.length === 0 ? (
          <div className="rounded-2xl bg-card p-5 text-sm text-muted-foreground">
            No upcoming activities.
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingActivities.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-2xl bg-card px-3 sm:px-4 py-2.5 text-sm">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg overflow-hidden bg-muted flex items-center justify-center text-xs">
                    {a.heroImageUrl ? (
                      <img src={a.heroImageUrl} alt={a.title} className="h-full w-full object-cover" />
                    ) : (
                      <span>&#128247;</span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.timeLabel}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
