"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useActivity } from "@/lib/activity-context";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FeedbackRow = {
  id: string;
  created_at: string;
  went_well: string | null;
  improve: string | null;
  book_again: "yes" | "no" | null;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export default function ActivityFeedbackPage() {
  const { activity } = useActivity();
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activity?.id) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("feedback")
        .select("id, created_at, went_well, improve, book_again")
        .eq("camp_id", activity.id)
        .order("created_at", { ascending: false });
      setRows((data ?? []) as FeedbackRow[]);
      setLoading(false);
    };
    void load();
  }, [activity?.id]);

  const wouldBookAgain = rows.filter((r) => r.book_again === "yes").length;
  const wouldNotBook = rows.filter((r) => r.book_again === "no").length;

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <EmptyState
        icon="rate_review"
        title="No feedback yet"
        description="Feedback is collected automatically after each camp ends. Check back once your first camp has finished."
        className="py-16"
      />
    );
  }

  return (
    <div className="space-y-5">

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Responses", value: rows.length },
          { label: "Would book again", value: wouldBookAgain },
          { label: "Suggested improvements", value: wouldNotBook },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-card bg-card px-4 py-3 space-y-0.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Individual responses */}
      <Card className="py-0">
        <CardHeader className="px-6 pt-6 pb-3">
          <CardTitle className="text-sm">All responses</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-5">
          {rows.map((row, i) => (
            <div key={row.id} className={i > 0 ? "pt-5 border-t border-border/50" : ""}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground">{fmtDate(row.created_at)}</p>
                {row.book_again && (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      background: row.book_again === "yes" ? "#f0fdf4" : "#fef2f2",
                      color: row.book_again === "yes" ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {row.book_again === "yes" ? "👍 Would book again" : "👎 Not sure"}
                  </span>
                )}
              </div>

              {row.went_well && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">What went well</p>
                  <p className="text-sm text-foreground leading-relaxed">{row.went_well}</p>
                </div>
              )}

              {row.improve && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Could be better</p>
                  <p className="text-sm text-foreground leading-relaxed">{row.improve}</p>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
