"use client";

import { useParams } from "next/navigation";
import CreateActivityPage from "../../new/_form";

/**
 * Edit route — renders the same form as /new but pre-populated with the
 * existing activity data.  We import from _form.tsx (not new/page.tsx)
 * so we avoid Next.js's page-entry bundling, which caused React error #310
 * when the page module was dynamically re-imported.
 */
export default function EditActivityPage() {
  const params = useParams<{ activityId: string }>();
  const activityId = params?.activityId ?? null;

  return <CreateActivityPage activityId={activityId} />;
}
