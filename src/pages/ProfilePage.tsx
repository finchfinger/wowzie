// src/pages/ProfilePage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Profile = {
  id: string;
  legal_name: string | null;
  preferred_first_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  about: string | null;
  is_host: boolean | null;
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
  sharedLabel?: string;
  heroImageUrl?: string | null;
};

const mockUpcomingActivities: UpcomingActivity[] = [];

const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-gray-800 shadow-sm ring-1 ring-black/5">
    {children}
  </span>
);

const ActivityRow: React.FC<{ activity: UpcomingActivity }> = ({
  activity,
}) => {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white shadow-sm ring-1 ring-black/5 px-3 sm:px-4 py-2.5 text-sm">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center text-xs">
          {activity.heroImageUrl ? (
            <img
              src={activity.heroImageUrl}
              alt={activity.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>📷</span>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900">{activity.title}</p>
            {activity.sharedLabel && (
              <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[10px] font-semibold text-pink-700">
                {activity.sharedLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">{activity.timeLabel}</p>
        </div>
      </div>
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="More options"
      >
        ⋮
      </button>
    </div>
  );
};

export const ProfilePage: React.FC = () => {
  const { id: profileIdParam } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hostProfile, setHostProfile] = useState<HostProfile | null>(null);
  const [upcomingActivities, setUpcomingActivities] = useState<
    UpcomingActivity[]
  >(mockUpcomingActivities);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile =
    currentUserId && profile && currentUserId === profile.id;

  // Load current user id once
  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!isMounted) return;

      if (error || !data.user) {
        setCurrentUserId(null);
      } else {
        setCurrentUserId(data.user.id);
      }
    };

    void loadUser();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load profile + host profile + upcoming activities
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

        // 1) Profiles (match schema exactly)
        const { data: profileRow, error: profileError } = await supabase
          .from("profiles")
          .select(
            [
              "id",
              "legal_name",
              "preferred_first_name",
              "email",
              "phone",
              "address_line1",
              "address_line2",
              "city",
              "state",
              "postal_code",
              "country",
              "about",
              "is_host",
            ].join(", ")
          )
          .eq("id", targetId)
          .maybeSingle();

        if (profileError) {
          console.error("[ProfilePage] Error loading profile:", profileError);
          setError("We could not load this profile.");
          setLoading(false);
          return;
        }

        if (!profileRow) {
          setError("Profile not found.");
          setLoading(false);
          return;
        }

        if (!isMounted) return;
        setProfile(profileRow as Profile);

        // 2) Host profile (optional)
        if (profileRow.is_host) {
          const { data: hostRow, error: hostError } = await supabase
            .from("host_profiles")
            .select(
              "id, profile_id, about, instagram_handle, x_handle, youtube_handle, tiktok_handle, website_url, identity_verified, supermom_badge"
            )
            .eq("profile_id", profileRow.id)
            .maybeSingle();

          if (!isMounted) return;

          if (hostError) {
            console.error(
              "[ProfilePage] Error loading host profile:",
              hostError
            );
          } else if (hostRow) {
            setHostProfile(hostRow as HostProfile);
          }
        } else {
          setHostProfile(null);
        }

        // 3) Upcoming activities (safe fallback if view does not exist)
        try {
          const { data: bookingsData, error: bookingsError } = await supabase
            .from("bookings_with_camps_view") // replace with real table/view later
            .select("id, camp_name, start_time, hero_image_url")
            .eq("profile_id", profileRow.id)
            .gt("start_time", new Date().toISOString())
            .order("start_time", { ascending: true })
            .limit(10);

          if (bookingsError) {
            console.warn(
              "[ProfilePage] Upcoming activities query failed; using empty list:",
              bookingsError
            );
            setUpcomingActivities([]);
          } else if (bookingsData) {
            const mapped: UpcomingActivity[] = bookingsData.map((row: any) => {
              const when = new Date(row.start_time);
              const timeLabel = when.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });
              return {
                id: row.id,
                title: row.camp_name,
                timeLabel,
                sharedLabel: "Shared booking",
                heroImageUrl: row.hero_image_url,
              };
            });
            setUpcomingActivities(mapped);
          }
        } catch (innerErr) {
          console.warn(
            "[ProfilePage] Error while loading upcoming activities:",
            innerErr
          );
          setUpcomingActivities([]);
        }

        setLoading(false);
      } catch (err) {
        console.error("[ProfilePage] Unexpected error:", err);
        if (!isMounted) return;
        setError("Something went wrong loading this profile.");
        setLoading(false);
      }
    };

    if (profileIdParam || currentUserId) {
      void loadProfile();
    }
    return () => {
      isMounted = false;
    };
  }, [profileIdParam, currentUserId]);

  const handleEditProfileClick = () => {
    navigate("/settings");
  };

  const handleMessageClick = () => {
    if (!profile) return;
    navigate(`/messages?to=${encodeURIComponent(profile.id)}`);
  };

  if (loading) {
    return (
      <main className="flex-1 bg-emerald-50">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8 text-sm text-gray-600">
          Loading profile…
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="flex-1 bg-emerald-50">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error || "Profile not found."}
          </div>
        </div>
      </main>
    );
  }

  const displayName =
    profile.preferred_first_name || profile.legal_name || "Parent";
  const aboutText =
    hostProfile?.about || profile.about || "This parent has not added a bio yet.";

  const locationPieces = [profile.city, profile.state].filter(Boolean);
  const locationLabel =
    locationPieces.length > 0 ? locationPieces.join(", ") : null;

  const showIdentityBadge =
    hostProfile?.identity_verified ||
    hostProfile?.supermom_badge ||
    profile.is_host;

  return (
    <main className="flex-1 bg-emerald-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🍓</span>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
                {displayName}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {showIdentityBadge && <Badge>Identity verified</Badge>}
              {hostProfile?.supermom_badge && <Badge>Supermom</Badge>}
              {locationLabel && (
                <span className="text-xs text-gray-600">
                  {locationLabel}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOwnProfile ? (
              <button
                type="button"
                onClick={handleEditProfileClick}
                className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-900 shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
              >
                Edit profile
              </button>
            ) : (
              <button
                type="button"
                onClick={handleMessageClick}
                className="inline-flex items-center rounded-full bg-gray-900 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-black"
              >
                Message{" "}
                {profile.preferred_first_name || profile.legal_name || "parent"}
              </button>
            )}
          </div>
        </div>

        {/* About + Host details */}
        <div className="space-y-6 mb-8">
          <section>
            <h2 className="text-sm font-semibold text-gray-900 mb-1.5">
              About{" "}
              {profile.preferred_first_name || profile.legal_name || "this parent"}
            </h2>
            <p className="text-sm leading-relaxed text-gray-700 max-w-3xl">
              {aboutText}
            </p>
          </section>

          {hostProfile && (
            <section className="rounded-2xl bg-emerald-100/70 px-4 sm:px-5 py-3.5 border border-emerald-200">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
                  Host profile
                </h3>
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => navigate("/host/settings")}
                    className="text-[11px] font-medium text-emerald-800 hover:text-emerald-900"
                  >
                    Edit host settings
                  </button>
                )}
              </div>
              <p className="text-xs text-emerald-900/90 max-w-3xl mb-2.5">
                Families see this when they view your listings and profile.
              </p>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-950">
                {hostProfile.instagram_handle && (
                  <p>
                    Instagram{" "}
                    <span className="font-medium">
                      @{hostProfile.instagram_handle}
                    </span>
                  </p>
                )}
                {hostProfile.x_handle && (
                  <p>
                    X{" "}
                    <span className="font-medium">
                      @{hostProfile.x_handle}
                    </span>
                  </p>
                )}
                {hostProfile.youtube_handle && (
                  <p>
                    YouTube{" "}
                    <span className="font-medium">
                      {hostProfile.youtube_handle}
                    </span>
                  </p>
                )}
                {hostProfile.tiktok_handle && (
                  <p>
                    TikTok{" "}
                    <span className="font-medium">
                      @{hostProfile.tiktok_handle}
                    </span>
                  </p>
                )}
                {hostProfile.website_url && (
                  <p>
                    Website{" "}
                    <a
                      href={hostProfile.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium underline"
                    >
                      {hostProfile.website_url.replace(/^https?:\/\//, "")}
                    </a>
                  </p>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Upcoming activities */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-1">
            Upcoming activities
          </h2>
          <p className="mb-3 text-xs text-gray-500">
            Here’s what{" "}
            {profile.preferred_first_name || profile.legal_name || "this family"}{" "}
            has coming up.
          </p>

          {upcomingActivities.length === 0 ? (
            <p className="text-xs text-gray-500">No upcoming activities yet.</p>
          ) : (
            <div className="space-y-2.5">
              {upcomingActivities.map((activity) => (
                <ActivityRow key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default ProfilePage;
