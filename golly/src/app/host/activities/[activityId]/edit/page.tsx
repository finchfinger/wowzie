"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

// Load the create/edit form client-only to avoid SSR hydration mismatches
// with the large form component (makeId(), file URLs, etc.)
const CreateActivityPage = dynamic(() => import("../../new/page"), {
  ssr: false,
  loading: () => (
    <main className="flex-1 min-h-screen">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 text-xs text-muted-foreground">
        Loading editor…
      </div>
    </main>
  ),
});

export default function EditActivityPage() {
  const params = useParams<{ activityId: string }>();
  return <CreateActivityPage activityId={params.activityId} />;
}
