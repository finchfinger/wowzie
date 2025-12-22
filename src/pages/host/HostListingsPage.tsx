// src/pages/host/HostListingsPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ToggleSwitch } from "../../components/ui/ToggleSwitch";
import { ActionsMenu } from "../../components/ui/ActionsMenu";

type HostListing = {
  id: string;
  name: string;
  image_url?: string | null;
  status?: string | null;
  meta?: any | null;
};

export const HostListingsPage: React.FC = () => {
  const [listings, setListings] = useState<HostListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const loadListings = async () => {
      setLoading(true);
      setError(null);

      // Get current user (host)
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("Error fetching user:", userError);
        if (isMounted) {
          setError("Could not determine host user.");
          setLoading(false);
        }
        return;
      }

      const hostId = userData.user?.id;
      if (!hostId) {
        if (isMounted) {
          setListings([]);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("camps")
        .select("id, name, image_url, status, meta")
        .eq("host_id", hostId)
        .order("name", { ascending: true });

      if (error) {
        console.error("Supabase error (camps):", error);
        if (isMounted) {
          setError("Could not load listings.");
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setListings((data || []) as HostListing[]);
        setLoading(false);
      }
    };

    loadListings();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleStatus = async (listing: HostListing) => {
    const currentStatus = listing.status || "inactive";
    const nextStatus = currentStatus === "active" ? "inactive" : "active";

    // Optimistic update
    setListings((prev) =>
      prev.map((l) =>
        l.id === listing.id ? { ...l, status: nextStatus } : l
      )
    );

    const { error } = await supabase
      .from("camps")
      .update({ status: nextStatus })
      .eq("id", listing.id);

    if (error) {
      console.error("Error updating listing status:", error);
      // Roll back
      setListings((prev) =>
        prev.map((l) =>
          l.id === listing.id ? { ...l, status: currentStatus } : l
        )
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Sort control */}
      <div className="flex items-center justify-between">
        <button className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700">
          <span className="mr-1 text-gray-500">↕︎</span>
          Alphabetical
        </button>
      </div>

      {loading && (
        <p className="text-xs text-gray-500">Loading your listings…</p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {!loading && !error && listings.length === 0 && (
        <p className="text-xs text-gray-500">
          You don&apos;t have any listings yet. Click{" "}
          <span className="font-medium">Create listing</span> to get started.
        </p>
      )}

      <div className="space-y-3">
        {listings.map((listing) => {
          const isActive = (listing.status || "inactive") === "active";

          return (
            <div
              key={listing.id}
              className="flex items-center justify-between rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-sm"
            >
              {/* LEFT: thumbnail + name (clickable → activity detail) */}
              <button
                type="button"
                onClick={() => navigate(`/host/activities/${listing.id}`)}
                className="flex items-center gap-3 text-left flex-1"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-[10px] text-gray-500 overflow-hidden">
                  {listing.image_url ? (
                    <img
                      src={listing.image_url}
                      alt={listing.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "Thumbnail"
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {listing.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isActive ? "Active" : "Inactive"}
                  </p>
                </div>
              </button>

              {/* RIGHT: toggle + actions (do NOT navigate) */}
              <div className="flex items-center gap-3">
                <ToggleSwitch
                  checked={isActive}
                  onChange={() => handleToggleStatus(listing)}
                  srLabel="Toggle listing visibility"
                />
                <ActionsMenu
                  items={[
                    {
                      label: "Edit listing",
                      onSelect: () => {
                        // later: navigate(`/host/activities/${listing.id}/overview`)
                        console.log("Edit", listing.id);
                      },
                    },
                    {
                      label: "View as parent",
                      onSelect: () => {
                        // later: navigate(`/camp/${listing.idOrSlug}`)
                        console.log("View as parent", listing.id);
                      },
                    },
                    {
                      label: "Archive",
                      onSelect: () => {
                        console.log("Archive", listing.id);
                      },
                    },
                  ]}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
