// src/pages/host/ActivityLayoutPage.tsx
import React, { useEffect, useState } from "react";
import {
  NavLink,
  Outlet,
  useNavigate,
  useParams,
} from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";

export type Activity = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  location: string | null;
  price_cents: number | null;
  is_published: boolean;
  is_active: boolean;
  hero_image_url?: string | null;
  meta?: any;
};

export type ActivityOutletContext = {
  activity: Activity | null;
  loading: boolean;
  error: string | null;
};

const ACTIVITY_COLUMNS = `
  id,
  name,
  slug,
  description,
  location,
  price_cents,
  is_published,
  is_active,
  hero_image_url,
  meta
`;

export const ActivityLayoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { activityId } = useParams<{ activityId: string }>();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadActivity = async () => {
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

      if (!isMounted) return;

      if (dbError) {
        console.error("Error loading activity:", dbError);
        setError("We couldn’t load this activity.");
        setActivity(null);
      } else {
        setActivity(data as Activity);
      }

      setLoading(false);
    };

    void loadActivity();

    return () => {
      isMounted = false;
    };
  }, [activityId]);

  const handleBack = () => {
    navigate("/host/listings");
  };

  const handleEdit = () => {
    if (!activityId) return;
    navigate(`/host/activities/${activityId}/edit`);
  };

  const handleViewListing = () => {
    if (!activity?.slug) return;
    navigate(`/camp/${activity.slug}`);
  };

  const currentTabClass = ({ isActive }: { isActive: boolean }) =>
    [
      "inline-flex items-center border-b-2 px-1 pb-2 text-xs font-medium",
      isActive
        ? "border-gray-900 text-gray-900"
        : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300",
    ].join(" ");

  return (
    <main className="flex-1 bg-violet-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
        {/* Top bar: back link + status */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
          >
            <span aria-hidden="true">←</span>
            Back to listings
          </button>

          {activity && (
            <span
              className={[
                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                activity.is_published
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                  : "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
              ].join(" ")}
            >
              {activity.is_published ? "Published" : "Draft"}
            </span>
          )}
        </div>

        {/* Header row: title + actions */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">
              {activity?.name || (loading ? "Loading activity…" : "Activity")}
            </h1>
            {activity?.description && (
              <p className="text-xs text-gray-600 max-w-xl">
                {activity.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="subtle"
              className="text-xs"
              onClick={handleViewListing}
              disabled={!activity?.slug}
            >
              View listing
            </Button>
            <Button
              type="button"
              className="text-xs bg-gray-900 text-white"
              onClick={handleEdit}
              disabled={!activityId}
            >
              Edit listing
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-black/5 mb-4">
          <nav className="-mb-px flex gap-4" aria-label="Activity sections">
            <NavLink
              to="overview"
              end
              className={currentTabClass}
            >
              Overview
            </NavLink>
            <NavLink
              to="guests"
              className={currentTabClass}
            >
              Guests
            </NavLink>
            <NavLink
              to="more"
              className={currentTabClass}
            >
              More
            </NavLink>
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm px-4 sm:px-6 py-5">
          <Outlet
            context={{
              activity,
              loading,
              error,
            } satisfies ActivityOutletContext}
          />
        </div>
      </div>
    </main>
  );
};

export default ActivityLayoutPage;
