"use client";

import { useSearchParams } from "next/navigation";
import CreateActivityPage from "./_form";

/**
 * new/page.tsx — Next.js route entry point.
 * Also handles editing: when ?activityId=<id> is present, the form
 * pre-populates with the existing activity data (full-page, no embedded layout).
 */
export default function NewActivityPage() {
  const searchParams = useSearchParams();
  const activityId = searchParams.get("activityId") ?? undefined;
  const stepParam = searchParams.get("step");
  const initialStep = stepParam !== null ? Math.max(0, parseInt(stepParam, 10) || 0) : undefined;

  return <CreateActivityPage activityId={activityId} initialStep={initialStep} />;
}
