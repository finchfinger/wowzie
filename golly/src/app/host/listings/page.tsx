"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { MoreHorizontal } from "lucide-react";

type HostListing = {
  id: string;
  name: string;
  slug?: string | null;
  image_url?: string | null;
  hero_image_url?: string | null;
  status?: string | null;
  meta?: any | null;
};

/* ------------------------------------------------------------------ */
/* ActionsMenu (inline)                                               */
/* ------------------------------------------------------------------ */

type ActionItem = {
  label: string;
  onSelect: () => void;
  tone?: "default" | "destructive";
  disabled?: boolean;
};

function ActionsMenu({ items, onClose }: { items: ActionItem[]; onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
        onClose?.();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); onClose?.(); }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent border border-input text-muted-foreground hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-foreground/10"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-popover text-popover-foreground shadow-lg z-20 overflow-hidden"
          role="menu"
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={`block w-full px-3 py-2 text-left text-xs transition-colors ${
                item.disabled
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : item.tone === "destructive"
                    ? "text-destructive hover:bg-destructive/10"
                    : "text-foreground hover:bg-accent"
              }`}
              onClick={() => {
                if (item.disabled) return;
                item.onSelect();
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function HostListingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<HostListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from("camps")
        .select(
          "id, slug, name, image_url, hero_image_url, status, meta",
        )
        .eq("host_id", user.id)
        .order("name", { ascending: true });

      if (!isMounted) return;

      if (dbError) {
        console.error("Error loading listings:", dbError);
        setError("Could not load listings.");
        setLoading(false);
        return;
      }

      setListings((data || []) as HostListing[]);
      setLoading(false);
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleToggleStatus = async (listing: HostListing) => {
    const currentStatus = listing.status || "inactive";
    const nextStatus =
      currentStatus === "active" ? "inactive" : "active";

    setListings((prev) =>
      prev.map((l) =>
        l.id === listing.id ? { ...l, status: nextStatus } : l,
      ),
    );

    const { error: updateError } = await supabase
      .from("camps")
      .update({ status: nextStatus })
      .eq("id", listing.id);

    if (updateError) {
      console.error("Error updating listing status:", updateError);
      setListings((prev) =>
        prev.map((l) =>
          l.id === listing.id
            ? { ...l, status: currentStatus }
            : l,
        ),
      );
    }
  };

  const handleArchive = async (listing: HostListing) => {
    if (archiveConfirmId !== listing.id) {
      setArchiveConfirmId(listing.id);
      return;
    }
    // Confirmed — optimistically remove from list
    setListings((prev) => prev.filter((l) => l.id !== listing.id));
    setArchiveConfirmId(null);
    await supabase
      .from("camps")
      .update({ is_active: false, is_published: false, status: "inactive" })
      .eq("id", listing.id);
  };

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading your listings&hellip;
      </p>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (listings.length === 0) {
    return (
      <div className="rounded-xl p-8 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          You haven&apos;t created any listings yet.
        </p>
        <Link
          href="/host/activities/new"
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Create your first listing
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sort control */}
      <div className="flex items-center justify-between">
        <button className="inline-flex items-center rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">
          <span className="mr-1">↕︎</span>
          Alphabetical
        </button>
      </div>

      {/* Listing rows */}
      <div className="space-y-3">
        {listings.map((listing) => {
          const isActive =
            (listing.status || "inactive") === "active";
          const thumb =
            listing.hero_image_url || listing.image_url || null;

          return (
            <div
              key={listing.id}
              className="flex items-center justify-between rounded-2xl px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              {/* LEFT: thumbnail + name (clickable) */}
              <button
                type="button"
                onClick={() =>
                  router.push(`/host/activities/${listing.id}`)
                }
                className="flex items-center gap-3 text-left flex-1 min-w-0"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-[10px] text-muted-foreground overflow-hidden flex-shrink-0">
                  {thumb ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={thumb}
                      alt={listing.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "Thumbnail"
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {listing.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isActive ? "Active" : "Inactive"}
                  </p>
                </div>
              </button>

              {/* RIGHT: toggle + actions */}
              <div className="flex items-center gap-3">
                <ToggleSwitch
                  checked={isActive}
                  onChange={() => handleToggleStatus(listing)}
                  srLabel="Toggle listing visibility"
                  variant="switch-only"
                />

                <ActionsMenu
                  onClose={() => setArchiveConfirmId(null)}
                  items={[
                    {
                      label: "Edit listing",
                      onSelect: () =>
                        router.push(
                          `/host/activities/${listing.id}/edit`,
                        ),
                    },
                    {
                      label: "View as parent",
                      onSelect: () => {
                        if (listing.slug)
                          router.push(`/camp/${listing.slug}`);
                      },
                      disabled: !listing.slug,
                    },
                    {
                      label: archiveConfirmId === listing.id ? "Confirm archive?" : "Archive",
                      tone: archiveConfirmId === listing.id ? "destructive" : "default",
                      onSelect: () => handleArchive(listing),
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
}
