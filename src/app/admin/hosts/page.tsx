"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type HostRow = {
  user_id: string;
  host_status: string;
  about: string | null;
  applied_at: string | null;
  settings: { application_notes?: string } | null;
  email?: string;
};

export default function AdminHostsPage() {
  const [hosts, setHosts] = useState<HostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
    });
  }, []);

  // Verify admin access whenever token is known
  useEffect(() => {
    if (token === null) return;
    if (!token) { setIsAdmin(false); setLoading(false); return; }
    fetch("/api/admin/check", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setIsAdmin(d.admin === true))
      .catch(() => setIsAdmin(false));
  }, [token]);

  useEffect(() => {
    if (!isAdmin) return;
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
  }, [isAdmin]);

  const filtered = hosts.filter((h) => filter === "all" || h.host_status === filter);

  const handleAction = async (userId: string, action: "approve" | "reject") => {
    if (!token) { alert("You are not logged in."); return; }
    setActionLoading(`${userId}-${action}`);
    try {
      const res = await fetch("/api/admin/update-host", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, action }),
      });
      const json = await res.json() as { ok?: boolean; error?: string; status?: string };
      if (!res.ok || !json.ok) {
        alert(`Error: ${json.error ?? "Unknown error"}`);
        return;
      }
      setHosts((prev) =>
        prev.map((h) => (h.user_id === userId ? { ...h, host_status: json.status! } : h))
      );
    } finally {
      setActionLoading(null);
    }
  };

  if (isAdmin === null) {
    return (
      <main>
        <div className="page-container py-8">
          <div className="page-grid">
            <div className="span-8-center text-sm text-muted-foreground animate-pulse">Checking access…</div>
          </div>
        </div>
      </main>
    );
  }

  if (isAdmin === false) {
    return (
      <main>
        <div className="page-container py-8">
          <div className="page-grid">
            <div className="span-8-center">
              <div className="rounded-2xl bg-card shadow-sm p-8 text-center space-y-3">
                <span className="material-symbols-rounded text-4xl text-destructive">lock</span>
                <h2 className="text-base font-semibold text-foreground">Access denied</h2>
                <p className="text-sm text-muted-foreground">You need admin permissions to view this page.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="page-container py-8">
        <div className="page-grid">
          <div className="span-10-center">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold text-foreground">Host Applications</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">Review and approve or reject host applications.</p>
              </div>
              <div className="flex items-center gap-1">
                {(["pending", "approved", "rejected", "all"] as const).map((f) => (
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
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
                No {filter === "all" ? "" : filter} applications.
              </div>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                {filtered.map((host) => {
                  const notes = host.settings?.application_notes ?? "";
                  const lines = notes.split("\n").slice(0, 10);
                  const isPending = host.host_status === "pending";
                  return (
                    <div key={host.user_id} className="px-6 py-5 flex items-start gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-muted-foreground">{host.user_id.slice(0, 8)}…</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            host.host_status === "approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : host.host_status === "rejected"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {host.host_status}
                          </span>
                          {host.applied_at && (
                            <span className="text-xs text-muted-foreground">
                              Applied {new Date(host.applied_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          )}
                        </div>
                        {lines.length > 0 && (
                          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                            {lines.join("\n")}
                          </pre>
                        )}
                      </div>
                      {isPending && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={!!actionLoading}
                            onClick={() => void handleAction(host.user_id, "reject")}
                            className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === `${host.user_id}-reject` ? "Rejecting…" : "Reject"}
                          </button>
                          <button
                            type="button"
                            disabled={!!actionLoading}
                            onClick={() => void handleAction(host.user_id, "approve")}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === `${host.user_id}-approve` ? "Approving…" : "Approve"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
