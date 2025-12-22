// src/pages/HostDashboardPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { HostListingCard } from "../components/activity/ActivityListingCard";

type HostTab = "listings" | "contacts" | "financials" | "settings";

type HostListing = {
  id: string;
  name?: string | null;
  description?: string | null;
  hero_image_url?: string | null;
  image_url?: string | null;
  start_time?: string | null;
  is_active?: boolean | null;
  status?: string | null;
  meta?: any | null;
};

const HOST_LISTINGS_TABLE = "camps";

const FALLBACK_LISTINGS: HostListing[] = [
  {
    id: "fallback-1",
    name: "Lakeview Coding Camp",
    description:
      "Week-long intro to Scratch, Roblox, and creative coding for curious kids.",
    hero_image_url: "https://placehold.co/200x200?text=Coding",
    start_time: "2025-07-08T09:00:00Z",
    is_active: true,
    status: "draft",
  },
  {
    id: "fallback-2",
    name: "Lincoln Park Soccer Clinic",
    description:
      "Fun skills and small-sided games in the park. Bring cleats if you have them.",
    hero_image_url: "https://placehold.co/200x200?text=Soccer",
    start_time: "2025-06-15T10:30:00Z",
    is_active: true,
    status: "approved",
  },
  {
    id: "fallback-3",
    name: "Northside Art & Clay Studio",
    description:
      "Hands-on pottery, collage, and drawing in a cozy neighborhood studio.",
    hero_image_url: "https://placehold.co/200x200?text=Art",
    start_time: "2025-06-20T13:00:00Z",
    is_active: true,
    status: "needs_review",
  },
];

type SortType = "alpha" | "upcoming";

function formatTimeLabel(dateStr?: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getStatusBadge(listing: HostListing): {
  label: string;
  tone: "neutral" | "destructive";
} | null {
  if (
    listing.status === "action_required" ||
    listing.status === "needs_review"
  ) {
    return { label: "Action required", tone: "destructive" };
  }
  if (listing.status === "draft") {
    return { label: "Draft", tone: "neutral" };
  }
  return null;
}

export const HostDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HostTab>("listings");
  const [listings, setListings] = useState<HostListing[]>([]);
  const [sort, setSort] = useState<SortType>("alpha");
  const [statusMessage, setStatusMessage] = useState<string>("");

  useEffect(() => {
    const loadListings = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        console.log("Supabase auth user (host dashboard):", user, userError);

        const { data, error } = await supabase
          .from(HOST_LISTINGS_TABLE)
          .select("*");

        if (error) {
          console.error("Error loading camps from Supabase:", error);
          setStatusMessage(
            "We couldn’t load your listings from Supabase. Showing sample data instead.",
          );
          setListings(FALLBACK_LISTINGS);
          return;
        }

        if (!data || data.length === 0) {
          setStatusMessage(
            "No listings found in Supabase yet. Showing sample data instead.",
          );
          setListings(FALLBACK_LISTINGS);
          return;
        }

        setStatusMessage("");
        setListings(data as HostListing[]);
      } catch (err) {
        console.error("Unexpected error loading listings:", err);
        setStatusMessage(
          "Something went wrong while loading your dashboard. Showing sample data instead.",
        );
        setListings(FALLBACK_LISTINGS);
      }
    };

    loadListings();
  }, []);

  const sortedListings = useMemo(() => {
    const items = [...listings];

    if (sort === "upcoming") {
      items.sort((a, b) => {
        const aTime = a.start_time ? new Date(a.start_time).getTime() : Infinity;
        const bTime = b.start_time ? new Date(b.start_time).getTime() : Infinity;
        return aTime - bTime;
      });
    } else {
      items.sort((a, b) => {
        const aTitle = (a.name || "").toLowerCase();
        const bTitle = (b.name || "").toLowerCase();
        return aTitle.localeCompare(bTitle);
      });
    }

    return items;
  }, [listings, sort]);

  const hasListings = sortedListings.length > 0;

  const handleToggleActive = (id: string, next: boolean) => {
    // For now just update local state; later wire to Supabase
    setListings((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, is_active: next } : item,
      ),
    );
  };

  const handleOpenMenu = (id: string) => {
    console.log("Open menu for listing:", id);
    // later: show menu / sheet
  };

  return (
    <main className="flex-1 bg-violet-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-10 lg:py-12">
        {statusMessage && (
          <p className="mb-3 text-xs text-gray-600">{statusMessage}</p>
        )}

        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-xs text-white">
              ⟳
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">
              Host Dashboard
            </h1>
          </div>

          <Link
            to="/activities/new"
            className="inline-flex items-center rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            Create listing
          </Link>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex items-center gap-6 text-sm border-b border-black/10">
          {(["listings", "contacts", "financials", "settings"] as HostTab[]).map(
            (tab) => {
              const isActive = activeTab === tab;
              const label =
                tab === "listings"
                  ? "Listings"
                  : tab === "contacts"
                  ? "Contacts"
                  : tab === "financials"
                  ? "Financials"
                  : "Settings";

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={
                    "pb-2 " +
                    (isActive
                      ? "border-b-2 border-gray-900 font-medium text-gray-900"
                      : "text-gray-500 hover:text-gray-900")
                  }
                >
                  {label}
                </button>
              );
            },
          )}
        </div>

        <div className="flex gap-6 items-start">
          {/* Left filters — only for Listings tab */}
          {activeTab === "listings" && (
            <aside className="hidden md:block w-40">
              <div className="rounded-xl bg-white shadow-sm border border-black/5 p-1 text-sm">
                <button
                  type="button"
                  className={
                    "w-full text-left rounded-lg px-3 py-2 text-xs mb-1 " +
                    (sort === "alpha"
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-50")
                  }
                  onClick={() => setSort("alpha")}
                >
                  Alphabetical
                </button>
                <button
                  type="button"
                  className={
                    "w-full text-left rounded-lg px-3 py-2 text-xs " +
                    (sort === "upcoming"
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-50")
                  }
                  onClick={() => setSort("upcoming")}
                >
                  Upcoming
                </button>
              </div>
            </aside>
          )}

          {/* Main content */}
          <section className="flex-1 space-y-4">
            {activeTab === "listings" && (
              <section className="space-y-4">
                {/* Sort dropdown */}
                <div className="flex items-center justify-between gap-3">
                  <div />
                  <div>
                    <select
                      className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                      value={sort}
                      onChange={(e) =>
                        setSort(
                          e.target.value === "upcoming" ? "upcoming" : "alpha",
                        )
                      }
                    >
                      <option value="alpha">Alphabetical</option>
                      <option value="upcoming">Upcoming</option>
                    </select>
                  </div>
                </div>

                {/* Listing cards */}
                {hasListings && (
                  <div className="space-y-3">
                    {sortedListings.map((listing) => {
                      const badge = getStatusBadge(listing);

                      return (
                        <HostListingCard
                          key={listing.id}
                          title={listing.name || "Untitled activity"}
                          timeLabel={formatTimeLabel(listing.start_time)}
                          imageUrl={
                            listing.hero_image_url || listing.image_url || undefined
                          }
                          placeholderLabel={listing.meta?.category_label}
                          statusLabel={badge?.label}
                          statusTone={badge?.tone ?? "neutral"}
                          isActive={!!listing.is_active}
                          onToggleActive={(next) =>
                            handleToggleActive(listing.id, next)
                          }
                          onOpenMenu={() => handleOpenMenu(listing.id)}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Empty state */}
                {!hasListings && (
                  <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 px-5 py-8 text-center text-sm text-gray-600">
                    <p className="mb-3">You don’t have any listings yet.</p>
                    <Link
                      to="/activities/new"
                      className="inline-flex items-center rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
                    >
                      Create your first listing
                    </Link>
                  </div>
                )}

                {/* Quick tips / actions */}
                <div className="mt-6 divide-y divide-black/5 rounded-2xl border border-black/5 bg-white text-sm">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        Turn Instant Book on or off
                      </p>
                      <p className="text-xs text-gray-600">
                        Choose how guests will book
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        Pick your policy for cancellations
                      </p>
                      <p className="text-xs text-gray-600">
                        Choose how guests will book
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        Pick your policy for cancellations
                      </p>
                      <p className="text-xs text-gray-600">
                        Choose how guests will book
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* The other tabs (contacts / financials / settings) can stay as you had them */}
            {/* ... */}
          </section>
        </div>
      </div>
    </main>
  );
};
