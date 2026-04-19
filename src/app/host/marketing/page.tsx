"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ListingSkeletons } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

type Listing = {
  id: string;
  name: string;
  image_url: string | null;
  hero_image_url: string | null;
  is_promoted: boolean;
  is_published: boolean | null;
};

const STANDARD_FEE = 10;
const PROMOTED_FEE = 15;

export default function HostMarketingPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data, error: dbErr } = await supabase
        .from("camps")
        .select("id, name, image_url, hero_image_url, is_promoted, is_published")
        .eq("host_id", user.id)
        .order("name", { ascending: true });
      if (dbErr) setError("Couldn't load your listings.");
      else setListings((data || []) as Listing[]);
      setLoading(false);
    };
    void load();
  }, [user]);

  const handleToggle = async (id: string, current: boolean) => {
    setToggling(id);
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, is_promoted: !current } : l))
    );
    const { error: dbErr } = await supabase
      .from("camps")
      .update({ is_promoted: !current })
      .eq("id", id);
    if (dbErr) {
      // Revert on failure
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, is_promoted: current } : l))
      );
      setError("Couldn't update this listing. Please try again.");
    }
    setToggling(null);
  };

  const promotedCount = listings.filter((l) => l.is_promoted).length;

  if (loading) {
    return (
      <Card className="py-0">
        <CardHeader className="px-8 pt-8 pb-4">
          <CardTitle>Marketing</CardTitle>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <ListingSkeletons count={3} className="mt-4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* How it works */}
      <Card className="py-0">
        <CardContent className="px-8 py-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <span className="material-symbols-rounded select-none text-primary" style={{ fontSize: 20 }} aria-hidden>trending_up</span>
            </div>
            <div className="space-y-3 flex-1">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Promote your listings</h2>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  Boosted listings appear at the top of search results and are prioritised in recommendations. You only pay when a family books — no upfront cost.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: "leaderboard",       label: "Top of search",  desc: "Appear before organic results" },
                  { icon: "paid",              label: "Pay on booking", desc: "15% fee instead of 10%" },
                  { icon: "tune",              label: "On/off anytime", desc: "No commitment, cancel anytime" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-2.5 rounded-lg bg-muted/40 px-3.5 py-3">
                    <span className="material-symbols-rounded select-none shrink-0 text-primary mt-0.5" style={{ fontSize: 16 }} aria-hidden>{item.icon}</span>
                    <div>
                      <p className="text-xs font-medium text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listings */}
      <Card className="py-0">
        <CardHeader className="px-8 pt-8 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>Your listings</CardTitle>
            {promotedCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {promotedCount} boosted
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          {error && (
            <p className="mb-4 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}

          {listings.length === 0 ? (
            <EmptyState
              icon="add_home_work"
              iconBg="bg-primary/10"
              iconColor="text-primary"
              title="No listings yet"
              description="Create a listing first, then come back to promote it."
              action={{ label: "Create listing", href: "/host/activities/new" }}
            />
          ) : (
            <div className="divide-y divide-border/50">
              {listings.map((listing) => {
                const thumb = listing.hero_image_url || listing.image_url;
                const isDisabled = toggling === listing.id || listing.is_published === false;
                return (
                  <div key={listing.id} className="flex items-center gap-4 py-4">
                    {/* Thumbnail */}
                    <div className="shrink-0 overflow-hidden rounded bg-muted" style={{ width: 56, height: 56 }}>
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt={listing.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-muted" />
                      )}
                    </div>

                    {/* Name + fee info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{listing.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {listing.is_promoted
                          ? <span className="text-primary font-medium">{PROMOTED_FEE}% fee when booked</span>
                          : <span>{STANDARD_FEE}% fee when booked</span>
                        }
                      </p>
                      {listing.is_published === false && (
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">Draft — publish to boost</p>
                      )}
                    </div>

                    {/* Toggle */}
                    <div className="shrink-0 flex items-center gap-2">
                      {listing.is_promoted && (
                        <span className="text-[11px] font-medium text-primary">Boosted</span>
                      )}
                      <ToggleSwitch
                        checked={listing.is_promoted}
                        onChange={() => handleToggle(listing.id, listing.is_promoted)}
                        disabled={isDisabled}
                        variant="switch-only"
                        srLabel={`Boost ${listing.name}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {listings.length > 0 && (
            <p className="mt-6 text-[11px] text-muted-foreground leading-relaxed border-t border-border/50 pt-4">
              Boosted listings are charged a {PROMOTED_FEE}% platform fee on each booking, compared to the standard {STANDARD_FEE}%. The additional fee is deducted from your payout — no upfront charges.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
