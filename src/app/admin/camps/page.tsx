"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type CampRow = {
  id: string;
  name: string;
  slug: string;
  is_published: boolean;
  is_active: boolean;
  created_at: string;
  category: string | null;
  price_cents: number | null;
  price_unit: string | null;
  host_id: string;
  capacity: number | null;
};

type Filter = "all" | "published" | "draft";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function AdminCampsPage() {
  const [camps, setCamps] = useState<CampRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [toggling, setToggling] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("camps")
        .select("id, name, slug, is_published, is_active, created_at, category, price_cents, price_unit, host_id, capacity")
        .order("created_at", { ascending: false });
      setCamps((data ?? []) as CampRow[]);
      setLoading(false);
    };
    void load();
  }, []);

  const handleTogglePublish = async (camp: CampRow) => {
    setToggling(camp.id);
    const next = !camp.is_published;
    const { error } = await supabase
      .from("camps")
      .update({ is_published: next, is_active: next })
      .eq("id", camp.id);
    if (!error) {
      setCamps((prev) => prev.map((c) => c.id === camp.id ? { ...c, is_published: next, is_active: next } : c));
    }
    setToggling(null);
  };

  const filtered = camps
    .filter((c) => filter === "all" ? true : filter === "published" ? c.is_published : !c.is_published)
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Camps</h1>
          <p className="mt-1 text-sm text-muted-foreground">{camps.length} total · {camps.filter(c => c.is_published).length} published</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary/50 w-44"
          />
          {(["all", "published", "draft"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-background border border-border px-6 py-10 text-center text-sm text-muted-foreground">
          No camps found.
        </div>
      ) : (
        <div className="rounded-xl bg-background border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Category</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Created</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">Price</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((camp) => (
                <tr key={camp.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground truncate max-w-[200px]">{camp.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{camp.slug}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell capitalize">
                    {camp.category ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell whitespace-nowrap">
                    {fmtDate(camp.created_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground text-right hidden sm:table-cell whitespace-nowrap">
                    {camp.price_cents
                      ? `$${Math.round(camp.price_cents / 100)}${camp.price_unit ? `/${camp.price_unit}` : ""}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      camp.is_published ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                    }`}>
                      {camp.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/camp/${camp.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <span className="material-symbols-rounded select-none" style={{ fontSize: 13 }}>open_in_new</span>
                        View
                      </Link>
                      <button
                        type="button"
                        disabled={toggling === camp.id}
                        onClick={() => void handleTogglePublish(camp)}
                        className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                          camp.is_published
                            ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                        }`}
                      >
                        {toggling === camp.id ? "…" : camp.is_published ? "Unpublish" : "Publish"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
