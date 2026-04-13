"use client";

import { useState } from "react";
import { useActivity } from "@/lib/activity-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MorePage() {
  const { activity, handleDuplicate, busyAction, deleteOpen, setDeleteOpen, confirmDelete, deleteError } = useActivity();
  const [copied, setCopied] = useState(false);

  if (!activity) return null;

  const slug = activity.slug;
  const eventUrl = slug ? `/camp/${slug}` : null;

  const handleCopy = () => {
    if (!eventUrl) return;
    void navigator.clipboard.writeText(`${window.location.origin}${eventUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">

      {/* Duplicate listing */}
      <Card>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Duplicate listing</p>
            <p className="text-sm text-muted-foreground mt-0.5">Create a copy of this event with the same details.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void handleDuplicate()} disabled={busyAction === "duplicate"}>
            {busyAction === "duplicate" ? "Duplicating…" : "Duplicate listing"}
          </Button>
        </CardContent>
      </Card>

      {/* Event page URL */}
      {eventUrl && (
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Event page URL</p>
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5">
              <span className="flex-1 text-sm text-muted-foreground truncate">{eventUrl}</span>
              <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel event */}
      <Card>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-destructive">Cancel Event</p>
            <p className="text-sm text-muted-foreground mt-0.5">Permanently delete this event. Cannot be undone.</p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            Cancel Event
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}
