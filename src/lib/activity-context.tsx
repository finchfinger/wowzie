"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type BookingStatus = "pending" | "confirmed" | "declined" | "waitlisted";

export type ChildInfo = {
  id: string;
  name: string;
  age: number | null;
  emoji: string | null;
};

export type CampBookingRow = {
  id: string;
  camp_id: string;
  user_id: string;
  status: BookingStatus;
  created_at: string;
  guests_count: number;
  contact_email: string | null;
  parentName?: string | null;
  parentEmail?: string | null;
  children?: ChildInfo[];
};

export type Activity = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number | null;
  price_cents: number | null;
  is_published: boolean | null;
  is_active: boolean | null;
  status: string | null;
  hero_image_url: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  start_time: string | null;
  end_time: string | null;
  start_local: string | null;
  end_local: string | null;
  schedule_tz: string | null;
  meta: any;
};

export const ACTIVITY_COLUMNS = `
  id, slug, name, description, location, capacity,
  price_cents, is_published, is_active, status,
  hero_image_url, image_url, image_urls,
  start_time, end_time, start_local, end_local, schedule_tz,
  meta
`;

/* ------------------------------------------------------------------ */
/* Context value                                                       */
/* ------------------------------------------------------------------ */

type ActivityContextValue = {
  activity: Activity | null;
  loading: boolean;
  error: string | null;
  pendingBookings: CampBookingRow[];
  pendingCount: number;
  busyAction: "duplicate" | "delete" | null;
  deleteOpen: boolean;
  deleteError: string | null;
  setDeleteOpen: (v: boolean) => void;
  handleEdit: () => void;
  handleDuplicate: () => Promise<void>;
  confirmDelete: () => Promise<void>;
};

const ActivityContext = createContext<ActivityContextValue | null>(null);

export function useActivity(): ActivityContextValue {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error("useActivity must be used within ActivityProvider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export function ActivityProvider({
  activityId,
  children,
}: {
  activityId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingBookings, setPendingBookings] = useState<CampBookingRow[]>([]);
  const [busyAction, setBusyAction] = useState<"duplicate" | "delete" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /* Load activity */
  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      const { data, error: dbError } = await supabase
        .from("camps")
        .select(ACTIVITY_COLUMNS)
        .eq("id", activityId)
        .single();
      if (!alive) return;
      if (dbError || !data) {
        setError("Could not load this activity.");
        setLoading(false);
        return;
      }
      setActivity(data as Activity);
      setLoading(false);
    };
    void load();
    return () => { alive = false; };
  }, [activityId]);

  /* Load pending bookings (lightweight — for header badge + overview cards) */
  useEffect(() => {
    if (!activity?.id) return;
    let alive = true;
    const loadPending = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      const res = await fetch(`/api/host/camp-bookings?campId=${activity.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!alive) return;
      const rows: CampBookingRow[] = res.ok ? await res.json() : [];
      setPendingBookings(rows.filter(r => r.status === "pending"));
    };
    void loadPending();
    return () => { alive = false; };
  }, [activity?.id]);

  const handleEdit = () => router.push(`/host/activities/${activityId}/edit`);

  const handleDuplicate = async () => {
    if (!activity || busyAction) return;
    setBusyAction("duplicate");
    try {
      const slug = `${(activity.slug || activity.name || "listing")
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}-copy-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error: insertErr } = await supabase
        .from("camps")
        .insert({
          slug, name: `(Copy) ${activity.name}`,
          description: activity.description, location: activity.location,
          capacity: activity.capacity, price_cents: activity.price_cents,
          hero_image_url: activity.hero_image_url, image_url: activity.image_url,
          image_urls: activity.image_urls, meta: activity.meta ?? {},
          is_published: false, is_active: true, status: "active",
        })
        .select("id").single();
      if (insertErr) throw insertErr;
      if (data?.id) router.push(`/host/activities/${data.id}/edit`);
    } catch {
      setError("Could not duplicate listing.");
    } finally {
      setBusyAction(null);
    }
  };

  const confirmDelete = async () => {
    if (busyAction) return;
    setBusyAction("delete");
    setDeleteError(null);
    try {
      const { error: delErr } = await supabase.from("camps").delete().eq("id", activityId);
      if (delErr) throw delErr;
      setDeleteOpen(false);
      router.push("/host/listings");
    } catch (e: any) {
      setDeleteError(e?.message ?? "Could not delete.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <ActivityContext.Provider value={{
      activity, loading, error,
      pendingBookings,
      pendingCount: pendingBookings.length,
      busyAction, deleteOpen, deleteError,
      setDeleteOpen, handleEdit, handleDuplicate, confirmDelete,
    }}>
      {children}
    </ActivityContext.Provider>
  );
}
