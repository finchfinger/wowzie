"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { BlockSkeletons } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/Alert";

type HostRow = {
  user_id: string;
  host_status: string;
  about: string | null;
  applied_at: string | null;
  settings: { application_notes?: string } | null;
};

type Filter = "pending" | "approved" | "rejected" | "all";

export default function AdminHostsPage() {
  const [hosts, setHosts] = useState<HostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error: dbErr } = await supabase
        .from("host_profiles")
        .select("user_id, host_status, about, applied_at, settings")
        .order("applied_at", { ascending: false });
      if (dbErr) { setError(dbErr.message); setLoading(false); return; }
      setHosts((data as HostRow[]) ?? []);
      setLoading(false);
    };
    void load();
  }, []);

  const filtered = hosts.filter((h) => filter === "all" || h.host_status === filter);

  const handleAction = async (userId: string, action: "approve" | "reject") => {
    if (!token) return;
    setActionLoading(`${userId}-${action}`);
    try {
      const res = await fetch("/api/admin/update-host", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, action }),
      });
      const json = await res.json() as { ok?: boolean; error?: string; status?: string };
      if (!res.ok || !json.ok) { alert(`Error: ${json.error ?? "Unknown error"}`); return; }
      setHosts((prev) => prev.map((h) => h.user_id === userId ? { ...h, host_status: json.status! } : h));
    } finally {
      setActionLoading(null);
    }
  };

  const statusVariant = (s: string): { variant: "confirmed" | "pending" | "cancelled"; label: string } => {
    if (s === "approved") return { variant: "confirmed", label: "Approved" };
    if (s === "rejected") return { variant: "cancelled", label: "Rejected" };
    return { variant: "pending", label: "Pending" };
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Hosts"
        subtitle="Review and approve or reject host applications."
        actions={
          <div className="flex items-center gap-1">
            {(["pending", "approved", "rejected", "all"] as Filter[]).map((f) => (
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
        }
      />

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <BlockSkeletons count={4} height="h-24" />
      ) : filtered.length === 0 ? (
        <EmptyState icon="person_check" title={`No ${filter === "all" ? "" : filter} applications`} />
      ) : (
        <div className="divide-y divide-border rounded-xl overflow-hidden bg-background border border-border">
          {filtered.map((host) => {
            const notes = host.settings?.application_notes ?? "";
            const isPending = host.host_status === "pending";
            const { variant, label } = statusVariant(host.host_status);
            return (
              <div key={host.user_id} className="px-5 py-5 flex items-start gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-xs text-muted-foreground">{host.user_id.slice(0, 8)}…</span>
                    <StatusBadge variant={variant} label={label} />
                    {host.applied_at && (
                      <span className="text-xs text-muted-foreground">
                        Applied {new Date(host.applied_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    )}
                  </div>
                  {notes.length > 0 && (
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-0.5">
                      {notes.split("\n").map((line, i) => {
                        const urlMatch = line.match(/^(Website|Social):\s*(.+)$/);
                        if (urlMatch) {
                          const urlLabel = urlMatch[1];
                          const val = urlMatch[2].trim();
                          const href = val.startsWith("http") ? val : `https://${val}`;
                          return (
                            <p key={i} className="font-mono">
                              <span>{urlLabel}: </span>
                              <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80">{val}</a>
                            </p>
                          );
                        }
                        return <p key={i} className={line === "" ? "h-2" : "font-mono"}>{line}</p>;
                      })}
                    </div>
                  )}
                </div>
                {isPending && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!!actionLoading}
                      onClick={() => void handleAction(host.user_id, "reject")}
                      className="text-destructive border-destructive/40 hover:bg-destructive/5"
                    >
                      {actionLoading === `${host.user_id}-reject` ? "Rejecting…" : "Reject"}
                    </Button>
                    <Button
                      size="sm"
                      disabled={!!actionLoading}
                      onClick={() => void handleAction(host.user_id, "approve")}
                    >
                      {actionLoading === `${host.user_id}-approve` ? "Approving…" : "Approve"}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
