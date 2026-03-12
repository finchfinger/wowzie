"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { ListingCard, type ListingCardData } from "@/components/host/ListingCard";

/* ── Delete confirmation modal ─────────────────────────── */

function DeleteConfirmModal({
  listing,
  onConfirm,
  onCancel,
}: {
  listing: ListingCardData;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-sm rounded-3xl bg-card border border-border shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 mx-auto">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-base font-semibold text-foreground">Delete listing?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{listing.name}</span> will be
            unpublished and hidden from parents. This can&apos;t be undone.
          </p>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-border bg-background py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-full bg-destructive text-destructive-foreground py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────── */

export default function HostListingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ListingCardData | null>(null);

  /* ── load ── */
  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from("camps")
        .select(
          "id, slug, name, image_url, hero_image_url, status, meta, capacity, start_time, end_time"
        )
        .eq("host_id", user.id)
        .order("name", { ascending: true });

      if (!isMounted) return;

      if (dbError) {
        setError("Could not load listings.");
        setLoading(false);
        return;
      }

      const rows = (data || []) as Omit<ListingCardData, "bookingCount" | "pendingCount">[];

      // Fetch booking counts
      const withCounts: ListingCardData[] = rows.map((r) => ({
        ...r,
        bookingCount: 0,
        pendingCount: 0,
      }));

      if (rows.length > 0) {
        const ids = rows.map((r) => r.id);
        const { data: bookingCounts } = await supabase
          .from("bookings")
          .select("camp_id, status")
          .in("camp_id", ids)
          .in("status", ["confirmed", "pending"]);

        const countMap: Record<string, { total: number; pending: number }> = {};
        for (const b of bookingCounts ?? []) {
          if (!countMap[b.camp_id]) countMap[b.camp_id] = { total: 0, pending: 0 };
          countMap[b.camp_id].total++;
          if (b.status === "pending") countMap[b.camp_id].pending++;
        }
        for (const l of withCounts) {
          l.bookingCount = countMap[l.id]?.total ?? 0;
          l.pendingCount = countMap[l.id]?.pending ?? 0;
        }
      }

      setListings(withCounts);
      setLoading(false);
    };

    void load();
    return () => { isMounted = false; };
  }, [user]);

  /* ── status change ── */
  const handleStatusChange = async (id: string, newStatus: "active" | "inactive") => {
    // Optimistic update
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
    );
    const { error } = await supabase
      .from("camps")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) {
      // Revert on failure
      setListings((prev) =>
        prev.map((l) =>
          l.id === id
            ? { ...l, status: newStatus === "active" ? "inactive" : "active" }
            : l
        )
      );
    }
  };

  /* ── delete ── */
  const handleDeleteRequest = (id: string) => {
    const listing = listings.find((l) => l.id === id);
    if (listing) setDeleteTarget(listing);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    // Optimistic remove
    setListings((prev) => prev.filter((l) => l.id !== id));
    await supabase
      .from("camps")
      .update({ is_active: false, is_published: false, status: "inactive" })
      .eq("id", id);
  };

  /* ── duplicate ── */
  const handleDuplicate = async (id: string) => {
    if (!user) return;
    const original = listings.find((l) => l.id === id);
    if (!original) return;

    const { data, error } = await supabase
      .from("camps")
      .insert([
        {
          host_id: user.id,
          name: `${original.name} (Copy)`,
          status: "inactive",
          is_published: false,
          is_active: false,
          meta: original.meta ?? {},
          capacity: original.capacity,
          image_url: original.image_url,
          hero_image_url: original.hero_image_url,
          start_time: original.start_time,
          end_time: original.end_time,
        },
      ])
      .select("id")
      .single();

    if (!error && data?.id) {
      router.push(`/host/activities/${data.id}/edit`);
    }
  };

  /* ── render ── */
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center space-y-3">
        <div className="text-3xl">🏕️</div>
        <p className="text-sm text-muted-foreground">
          You haven&apos;t created any listings yet.
        </p>
        <Link
          href="/host/activities/new"
          className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Create your first listing
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteRequest}
            onDuplicate={handleDuplicate}
          />
        ))}
      </div>

      {deleteTarget && (
        <DeleteConfirmModal
          listing={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
