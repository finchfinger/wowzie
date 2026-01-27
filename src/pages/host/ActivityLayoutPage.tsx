// src/pages/host/ActivityLayoutPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";
import { Tabs, type TabItem } from "../../components/ui/Tabs";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { ActionsMenu } from "../../components/ui/ActionsMenu";

export type Activity = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  location: string | null;

  // ✅ added back (ActivityOverviewPage expects this)
  capacity: number | null;

  price_cents: number | null;
  price_unit: string | null;

  is_published: boolean | null;
  is_active: boolean | null;

  status: string | null;
  host_id: string | null;

  image_url: string | null;
  hero_image_url: string | null;
  image_urls: string[] | null;

  category: string | null;
  categories: string[] | null;

  featured: boolean | null;
  is_featured: boolean | null;

  listing_type: string | null;
  format: string | null;
  time_of_day: string | null;

  duration_minutes: number | null;
  schedule_days: string[] | null;
  series_weeks: number | null;

  start_time: string | null;
  end_time: string | null;

  start_local: string | null;
  end_local: string | null;
  schedule_tz: string | null;

  program_id: string | null;

  meta: any;
};

export type ActivityOutletContext = {
  activity: Activity | null;
  loading: boolean;
  error: string | null;
};

const ACTIVITY_COLUMNS = `
  id,
  slug,
  name,
  description,
  location,
  capacity,
  price_cents,
  price_unit,
  is_published,
  is_active,
  status,
  host_id,
  image_url,
  hero_image_url,
  image_urls,
  category,
  categories,
  featured,
  is_featured,
  listing_type,
  format,
  time_of_day,
  duration_minutes,
  schedule_days,
  series_weeks,
  start_time,
  end_time,
  start_local,
  end_local,
  schedule_tz,
  program_id,
  meta
`;

type ActivityTabId = "overview" | "guests" | "more";

const ACTIVITY_TABS: TabItem[] = [
  { id: "overview", label: "Overview" },
  { id: "guests", label: "Guests" },
  { id: "more", label: "More" },
];

function slugify(input: string) {
  return String(input ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function makeUniqueSlug(base: string) {
  const safeBase = slugify(base || "listing") || "listing";
  const suffix =
    "copy-" +
    Math.random().toString(36).slice(2, 6) +
    "-" +
    Date.now().toString(36).slice(-4);
  return `${safeBase}-${suffix}`.slice(0, 120);
}

function DeleteEventModal({
  open,
  title,
  deleting,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  deleting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close delete modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />

      <div className="relative mx-auto mt-24 w-[92%] max-w-md rounded-2xl border border-black/10 bg-white p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Delete event?</p>
            <p className="mt-1 text-xs text-gray-600">
              This will permanently delete <span className="font-medium">{title}</span> and any
              related data. This cannot be undone.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="subtle" className="text-xs" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>

          <Button
            className="text-xs bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete event"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export const ActivityLayoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activityId } = useParams<{ activityId: string }>();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [busyAction, setBusyAction] = useState<"duplicate" | "delete" | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const activeTab: ActivityTabId = useMemo(() => {
    const path = location.pathname;
    if (path.includes("/guests")) return "guests";
    if (path.includes("/more")) return "more";
    return "overview";
  }, [location.pathname]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!activityId) {
        setError("Missing activity id in the URL.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from("camps")
        .select(ACTIVITY_COLUMNS)
        .eq("id", activityId)
        .single();

      if (!alive) return;

      if (dbError) {
        console.error("Error loading activity:", dbError);
        setActivity(null);
        setError("We couldn’t load this activity.");
      } else {
        setActivity((data ?? null) as Activity | null);
      }

      setLoading(false);
    };

    void load();

    return () => {
      alive = false;
    };
  }, [activityId]);

  const handleEdit = () => {
    if (!activityId) return;
    navigate(`/host/activities/${activityId}/edit`);
  };

  const handleEventPage = () => {
    if (!activity?.slug) return;
    navigate(`/camp/${activity.slug}`);
  };

  const handleSendBlast = () => {
    if (!activityId) return;
    navigate(`/messages?blast=${encodeURIComponent(activityId)}`);
  };

  const handleDuplicateListing = async () => {
    if (!activityId || !activity) return;
    if (busyAction) return;

    setBusyAction("duplicate");
    setError(null);

    try {
      const newSlug = makeUniqueSlug(activity.slug || activity.name || "listing");

      const insertPayload: any = {
        slug: newSlug,
        name: `(Copy) ${activity.name || "Activity"}`,
        description: activity.description,
        location: activity.location,

        // ✅ copy capacity too
        capacity: activity.capacity ?? null,

        price_cents: activity.price_cents,
        price_unit: activity.price_unit ?? undefined,

        image_url: activity.image_url,
        hero_image_url: activity.hero_image_url,
        image_urls: activity.image_urls ?? [],

        category: activity.category ?? "general",
        categories: activity.categories ?? null,

        featured: Boolean(activity.featured ?? false),
        is_featured: Boolean(activity.is_featured ?? false),

        listing_type: activity.listing_type ?? undefined,
        format: activity.format ?? undefined,
        time_of_day: activity.time_of_day ?? null,

        duration_minutes: activity.duration_minutes ?? null,
        schedule_days: activity.schedule_days ?? null,
        series_weeks: activity.series_weeks ?? null,

        start_time: activity.start_time ?? null,
        end_time: activity.end_time ?? null,

        start_local: activity.start_local ?? null,
        end_local: activity.end_local ?? null,
        schedule_tz: activity.schedule_tz ?? "America/Chicago",

        program_id: activity.program_id ?? null,
        meta: activity.meta ?? {},

        is_published: false,
        is_active: true,
        status: "active",
      };

      Object.keys(insertPayload).forEach((k) => {
        if (insertPayload[k] === undefined) delete insertPayload[k];
      });

      const { data, error: insertErr } = await supabase
        .from("camps")
        .insert(insertPayload)
        .select("id")
        .single();

      if (insertErr) throw insertErr;
      if (!data?.id) throw new Error("Duplicate failed. No id returned.");

      navigate(`/host/activities/${data.id}/edit`);
    } catch (e) {
      console.error("Duplicate listing failed:", e);
      setError("Could not duplicate listing.");
    } finally {
      setBusyAction(null);
    }
  };

  const openDelete = () => {
    setDeleteError(null);
    setDeleteOpen(true);
  };

  const closeDelete = () => {
    if (busyAction === "delete") return;
    setDeleteOpen(false);
  };

  const confirmDelete = async () => {
    if (!activityId) return;
    if (busyAction) return;

    setBusyAction("delete");
    setDeleteError(null);

    try {
      const { error: delErr } = await supabase.from("camps").delete().eq("id", activityId);
      if (delErr) throw delErr;

      setDeleteOpen(false);
      navigate("/host/listings");
    } catch (e: any) {
      console.error("Delete event failed:", e);
      setDeleteError(e?.message ? String(e.message) : "Could not delete this event.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleTabChange = (id: string) => {
    const tab = id as ActivityTabId;

    if (tab === "overview") {
      navigate("overview", { replace: false });
      return;
    }
    navigate(tab, { replace: false });
  };

  return (
    <main className="flex-1 bg-violet-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
        <SectionHeader
          className="mb-4"
          title={loading ? "Loading activity…" : activity?.name || "Activity"}
          backLink={{ to: "/host/listings", label: "Back to listings" }}
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleEdit}
                disabled={!activityId}
              >
                Edit listing
              </Button>

              <ActionsMenu
                triggerVariant="outline"
                triggerSize="sm"
                items={[
                  { label: "Event page", onSelect: handleEventPage },
                  { label: "Send a blast", onSelect: handleSendBlast },
                  {
                    label: busyAction === "duplicate" ? "Duplicating…" : "Duplicate listing",
                    onSelect: handleDuplicateListing,
                  },
                  {
                    label: "Delete event",
                    tone: "destructive",
                    onSelect: openDelete,
                  },
                ]}
              />
            </>
          }
        />

        {error ? <p className="mb-3 text-xs text-red-600">{error}</p> : null}

        <Tabs
          tabs={ACTIVITY_TABS}
          activeId={activeTab}
          onChange={handleTabChange}
          className="mb-4"
        />

        <div className="bg-white rounded-2xl border border-black/5 shadow-sm px-4 sm:px-6 py-5">
          <Outlet
            context={
              {
                activity,
                loading,
                error,
              } satisfies ActivityOutletContext
            }
          />
        </div>
      </div>

      <DeleteEventModal
        open={deleteOpen}
        title={activity?.name || "this event"}
        deleting={busyAction === "delete"}
        error={deleteError}
        onClose={closeDelete}
        onConfirm={confirmDelete}
      />
    </main>
  );
};

export default ActivityLayoutPage;
