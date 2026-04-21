"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "@/components/ui/EmptyState";
import { BlockSkeletons } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

type UserRow = {
  id: string;
  email: string | null;
  created_at: string;
  preferred_first_name: string | null;
  legal_name: string | null;
  is_host: boolean;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const fmtRelative = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return fmtDate(iso);
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Load profiles + check which ones have host_profiles
      const [{ data: profiles }, { data: hostIds }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, created_at, preferred_first_name, legal_name")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("host_profiles")
          .select("user_id"),
      ]);

      const hostSet = new Set((hostIds ?? []).map((h) => h.user_id));
      const rows: UserRow[] = (profiles ?? []).map((p) => ({
        ...p,
        is_host: hostSet.has(p.id),
      }));

      setUsers(rows);
      setLoading(false);
    };
    void load();
  }, []);

  const filtered = users.filter(
    (u) =>
      !search ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.preferred_first_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.legal_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const thisWeek = users.filter(
    (u) => Date.now() - new Date(u.created_at).getTime() < 7 * 86400000
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {users.length} total · {users.filter((u) => u.is_host).length} hosts
          {thisWeek > 0 && (
            <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              +{thisWeek} this week
            </span>
          )}
        </p>
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or name…"
          className="h-8 w-60 text-sm"
        />
      </div>

      {loading ? (
        <BlockSkeletons count={6} height="h-12" />
      ) : filtered.length === 0 ? (
        <EmptyState icon="group" title="No users found" description="Signed-up users will appear here." />
      ) : (
        <div className="rounded-xl bg-background border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Joined</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-sm text-foreground truncate max-w-[220px]">
                    {u.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                    {u.preferred_first_name ?? u.legal_name ?? <span className="text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground" title={fmtDate(u.created_at)}>
                      {fmtRelative(u.created_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.is_host ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-medium text-violet-700">
                        <span className="material-symbols-rounded select-none" style={{ fontSize: 11 }}>storefront</span>
                        Host
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Parent
                      </span>
                    )}
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
