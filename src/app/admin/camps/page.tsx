"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { BlockSkeletons } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  approval_status: "pending_review" | "approved" | "rejected";
};

type Filter = "all" | "pending_review" | "published" | "draft" | "rejected";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function AdminCampsPage() {
  const [camps, setCamps] = useState<CampRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [toggling, setToggling] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("camps")
        .select("id, name, slug, is_published, is_active, created_at, category, price_cents, price_unit, host_id, capacity, approval_status")
        .order("created_at", { ascending: false });
      setCamps((data ?? []) as CampRow[]);
      setLoading(false);
    };
    void load();
  }, []);

  /* ── Publish / unpublish (already-approved camps) ── */
  const handleTogglePublish = async (camp: CampRow) => {
    setToggling(camp.id);
    const next = !camp.is_published;
    const { error } = await supabase
      .from("camps")
      .update({ is_published: next, is_active: next })
      .eq("id", camp.id);
    if (!error) {
      setCamps((prev) =>
        prev.map((c) => c.id === camp.id ? { ...c, is_published: next, is_active: next } : c)
      );
    }
    setToggling(null);
  };

  /* ── Approve / reject (pending_review or rejected camps) ── */
  const handleApprovalAction = async (camp: CampRow, action: "approve" | "reject") => {
    if (!token) return;
    setApproving(`${camp.id}-${action}`);
    try {
      const res = await fetch("/api/admin/approve-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ campId: camp.id, action }),
      });
      const json = await res.json() as { ok?: boolean; error?: string; approval_status?: string };
      if (!res.ok || !json.ok) { alert(`Error: ${json.error ?? "Unknown error"}`); return; }
      const newApprovalStatus = json.approval_status as CampRow["approval_status"];
      setCamps((prev) =>
        prev.map((c) =>
          c.id === camp.id
            ? {
                ...c,
                approval_status: newApprovalStatus,
                is_published: action === "approve" ? true : false,
                is_active: action === "approve" ? true : false,
              }
            : c
        )
      );
    } finally {
      setApproving(null);
    }
  };

  /* ── Filtering ── */
  const filtered = camps
    .filter((c) => {
      if (filter === "all") return true;
      if (filter === "pending_review") return c.approval_status === "pending_review";
      if (filter === "rejected") return c.approval_status === "rejected";
      if (filter === "published") return c.approval_status === "approved" && c.is_published;
      if (filter === "draft") return c.approval_status === "approved" && !c.is_published;
      return true;
    })
    .filter(
      (c) =>
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.includes(search.toLowerCase())
    );

  const pendingCount = camps.filter((c) => c.approval_status === "pending_review").length;

  /* ── Status badge for a camp ── */
  const campStatusBadge = (c: CampRow) => {
    if (c.approval_status === "pending_review") return <StatusBadge variant="reviewing" />;
    if (c.approval_status === "rejected") return <StatusBadge variant="rejected" />;
    return <StatusBadge variant={c.is_published ? "published" : "draft"} />;
  };

  /* ── Action buttons for a camp ── */
  const campActions = (camp: CampRow) => {
    const approveKey = `${camp.id}-approve`;
    const rejectKey = `${camp.id}-reject`;
    const isBusy = toggling === camp.id || !!approving?.startsWith(camp.id);

    if (camp.approval_status === "pending_review") {
      return (
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/camp/${camp.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <span className="material-symbols-rounded select-none" style={{ fontSize: 13 }}>open_in_new</span>
            View
          </Link>
          <Button
            size="sm"
            variant="outline"
            disabled={isBusy}
            onClick={() => void handleApprovalAction(camp, "reject")}
            className="text-xs h-7 px-2.5 text-destructive border-destructive/40 hover:bg-destructive/5"
          >
            {approving === rejectKey ? "…" : "Reject"}
          </Button>
          <Button
            size="sm"
            disabled={isBusy}
            onClick={() => void handleApprovalAction(camp, "approve")}
            className="text-xs h-7 px-2.5"
          >
            {approving === approveKey ? "…" : "Approve"}
          </Button>
        </div>
      );
    }

    if (camp.approval_status === "rejected") {
      return (
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/camp/${camp.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <span className="material-symbols-rounded select-none" style={{ fontSize: 13 }}>open_in_new</span>
            View
          </Link>
          <Button
            size="sm"
            variant="outline"
            disabled={isBusy}
            onClick={() => void handleApprovalAction(camp, "approve")}
            className="text-xs h-7 px-2.5"
          >
            {approving === approveKey ? "…" : "Approve"}
          </Button>
        </div>
      );
    }

    // Approved — normal publish toggle
    return (
      <div className="flex items-center justify-end gap-2">
        <Link
          href={`/camp/${camp.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <span className="material-symbols-rounded select-none" style={{ fontSize: 13 }}>open_in_new</span>
          View
        </Link>
        <Button
          size="sm"
          variant={camp.is_published ? "destructive" : "outline"}
          disabled={isBusy}
          onClick={() => void handleTogglePublish(camp)}
          className="text-xs h-7 px-2.5"
        >
          {toggling === camp.id ? "…" : camp.is_published ? "Unpublish" : "Publish"}
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {camps.length} total · {camps.filter((c) => c.is_published).length} published
          {pendingCount > 0 && (
            <span className="ml-2 inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">
              {pendingCount} awaiting review
            </span>
          )}
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="h-8 w-44 text-sm"
          />
          <div className="flex items-center gap-1">
            {(["all", "pending_review", "published", "draft", "rejected"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {f === "all" ? "All" : f === "pending_review" ? "In review" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <BlockSkeletons count={5} height="h-14" />
      ) : filtered.length === 0 ? (
        <EmptyState icon="camping" title="No camps found" description="Try adjusting your search or filter." />
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
                    <p className="font-medium text-foreground truncate max-w-[200px]">{camp.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{camp.slug}</p>
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
                    {campStatusBadge(camp)}
                  </td>
                  <td className="px-4 py-3">
                    {campActions(camp)}
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
