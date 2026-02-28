"use client";

import { useParams } from "next/navigation";
import CreateActivityPage from "../../new/page";

export default function EditActivityPage() {
  const params = useParams<{ activityId: string }>();
  return <CreateActivityPage activityId={params.activityId} />;
}
