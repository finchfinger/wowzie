"use client";

import { useParams, useSearchParams } from "next/navigation";
import CreateActivityPage from "../../new/_form";

/**
 * Edit route — renders the same form as /new but pre-populated with the
 * existing activity data.  We import from _form.tsx (not new/page.tsx)
 * so we avoid Next.js's page-entry bundling, which caused React error #310
 * when the page module was dynamically re-imported.
 *
 * Supports ?step=N to jump directly to a specific step.
 */
export default function EditActivityPage() {
  const params = useParams<{ activityId: string }>();
  const searchParams = useSearchParams();
  const activityId = params?.activityId ?? null;
  const stepParam = searchParams.get("step");
  const initialStep = stepParam !== null ? Math.max(0, parseInt(stepParam, 10) || 0) : undefined;

  return <CreateActivityPage activityId={activityId} initialStep={initialStep} embedded />;
}
