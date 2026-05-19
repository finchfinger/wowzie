"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { BlockSkeletons } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type OrgRow = {
  id: string;
  legal_name: string | null;
  preferred_first_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_claimed: boolean;
  claim_token: string | null;
};

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch("/api/admin/organizations", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json() as OrgRow[];
        setOrgs(data);
      }
      setLoading(false);
    };
    void load();
  }, []);

  const filtered = orgs.filter((o) =>
    !search ||
    (o.legal_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (o.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const copyClaimLink = (org: OrgRow) => {
    if (!org.claim_token) return;
    const url = `${window.location.origin}/claim?token=${org.claim_token}`;
    void navigator.clipboard.writeText(url);
    setCopied(org.id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {orgs.length} managed orgs · {orgs.filter((o) => o.is_claimed).length} claimed
        </p>
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="h-8 w-48 text-sm"
        />
      </div>

      {loading ? (
        <BlockSkeletons count={6} height="h-14" />
      ) : filtered.length === 0 ? (
        <EmptyState icon="business" title="No organizations" description="No wowzi-managed orgs found." />
      ) : (
        <div className="rounded-xl bg-background border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Organization</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Email</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((org) => (
                <tr key={org.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{org.legal_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground font-mono">{org.id}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                    {org.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {org.is_claimed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        <span className="material-symbols-outlined select-none text-[12px]">verified</span>
                        Claimed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        <span className="material-symbols-outlined select-none text-[12px]">lock</span>
                        Unclaimed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/profile/${org.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <span className="material-symbols-outlined select-none text-[13px]">open_in_new</span>
                        View
                      </Link>
                      {!org.is_claimed && org.claim_token && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyClaimLink(org)}
                          className="text-xs h-7 px-2.5 gap-1"
                        >
                          <span className="material-symbols-outlined select-none text-[13px]">
                            {copied === org.id ? "check" : "link"}
                          </span>
                          {copied === org.id ? "Copied!" : "Claim link"}
                        </Button>
                      )}
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
