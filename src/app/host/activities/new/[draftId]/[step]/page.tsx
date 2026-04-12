"use client";

import { useParams } from "next/navigation";
import CreateActivityPage from "../../_form";

export default function EditStepPage() {
  const params = useParams<{ draftId: string; step: string }>();
  return (
    <CreateActivityPage
      activityId={params.draftId}
      initialStep={Number(params.step) || 0}
    />
  );
}
