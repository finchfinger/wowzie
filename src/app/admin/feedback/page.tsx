"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type FeedbackRow = {
  id: string;
  created_at: string;
  went_well: string | null;
  improve: string | null;
  book_again: "yes" | "no" | null;
  camps: { name: string; slug: string } | null;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function AdminFeedbackPage() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "yes" | "no">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("feedback")
        .select("id, created_at, went_well, improve, book_again, camps:camp_id(name, slug)")
        .order("created_at", { ascending: false });
      setRows((data ?? []) as unknown as FeedbackRow[]);
      setLoading(false);
    };
    void load();
  }, []);

  const filtered = rows
    .filter((r) => filter === "all" || r.book_again === filter)
    .filter((r) => !search || (r.camps?.name ?? "").toLowerCase().includes(search.toLowerCase()));

  const pct = rows.length
    ? Math.round((rows.filter(r => r.book_again === "yes").length / rows.length) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Feedback</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} responses · {pct}% would book again
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by camp…"
            className="h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary/50 w-44"
          />
          {(["all", "yes", "no"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {f === "all" ? "All" : f === "yes" ? "👍 Would book" : "👎 Not sure"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-background border border-border px-6 py-10 text-center text-sm text-muted-foreground">
          No feedback yet.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <div key={row.id} className="rounded-xl bg-background border border-border px-5 py-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{row.camps?.name ?? "Unknown camp"}</p>
                  {row.book_again && (
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      row.book_again === "yes" ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600"
                    }`}>
                      {row.book_again === "yes" ? "👍 Would book" : "👎 Not sure"}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{fmtDate(row.created_at)}</p>
              </div>
              {row.went_well && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">What went well</p>
                  <p className="text-sm text-foreground leading-relaxed">{row.went_well}</p>
                </div>
              )}
              {row.improve && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Could be better</p>
                  <p className="text-sm text-foreground leading-relaxed">{row.improve}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
