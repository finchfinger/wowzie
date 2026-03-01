"use client";

import { useState, useEffect, type ComponentType } from "react";
import { useParams } from "next/navigation";

type EditProps = { activityId?: string | null };

/**
 * Load CreateActivityPage lazily in a useEffect so the import only runs
 * client-side — avoiding any SSR/hydration mismatch in the giant form.
 */
export default function EditActivityPage() {
  const params = useParams<{ activityId: string }>();
  const activityId = params?.activityId ?? null;

  const [Page, setPage] = useState<ComponentType<EditProps> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("../../new/page")
      .then((mod) => {
        if (!cancelled) setPage(() => mod.default as ComponentType<EditProps>);
      })
      .catch((err) => {
        console.error("[EditActivityPage] failed to load form:", err);
        if (!cancelled) setLoadError("Could not load the editor. Please refresh.");
      });
    return () => { cancelled = true; };
  }, []);

  if (loadError) {
    return (
      <main className="flex-1 min-h-screen">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 lg:py-12">
          <p className="text-sm text-destructive">{loadError}</p>
        </div>
      </main>
    );
  }

  if (!Page) {
    return (
      <main className="flex-1 min-h-screen">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 lg:py-12 text-xs text-muted-foreground">
          Loading editor…
        </div>
      </main>
    );
  }

  return <Page activityId={activityId} />;
}
