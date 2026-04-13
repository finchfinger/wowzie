"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal, Search, ChevronDown, UserPlus, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useActivity, type CampBookingRow, type ChildInfo, type BookingStatus } from "@/lib/activity-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function calcAge(birthdate: string | null): number | null {
  if (!birthdate) return null;
  const d = new Date(birthdate + "T12:00:00");
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age <= 25 ? age : null;
}

function whenLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000,
  );
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString();
}

/* ------------------------------------------------------------------ */
/* Guests page                                                         */
/* ------------------------------------------------------------------ */

export default function GuestsPage() {
  const params = useParams<{ activityId: string }>();
  const router = useRouter();
  const activityId = params.activityId;
  const { activity } = useActivity();

  const [guests, setGuests] = useState<CampBookingRow[]>([]);
  const [guestsLoading, setGuestsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [guestSearch, setGuestSearch] = useState("");

  useEffect(() => {
    if (!activity?.id) return;
    let alive = true;
    const loadGuests = async () => {
      setGuestsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      const res = await fetch(`/api/host/camp-bookings?campId=${activity.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const bookingRows = res.ok ? await res.json() : [];
      if (!alive) return;

      const rows: CampBookingRow[] = (bookingRows ?? []) as CampBookingRow[];
      const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const [{ data: profileRows }, { data: childRows }] = await Promise.all([
          supabase.from("profiles").select("id, legal_name, preferred_first_name, email").in("id", userIds),
          supabase.from("children").select("id, legal_name, preferred_name, avatar_emoji, birthdate, parent_id").in("parent_id", userIds),
        ]);
        const profileMap = new Map(((profileRows ?? []) as any[]).map(p => [p.id, p]));
        const childrenByParent = new Map<string, ChildInfo[]>();
        for (const c of (childRows ?? []) as any[]) {
          const info: ChildInfo = { id: c.id, name: c.preferred_name || c.legal_name || "Child", age: calcAge(c.birthdate), emoji: c.avatar_emoji ?? null };
          const arr = childrenByParent.get(c.parent_id) ?? [];
          arr.push(info);
          childrenByParent.set(c.parent_id, arr);
        }
        for (const row of rows) {
          const p = profileMap.get(row.user_id) as any;
          row.parentName = p?.preferred_first_name ? `${p.preferred_first_name} ${p.legal_name ?? ""}`.trim() : p?.legal_name ?? null;
          row.parentEmail = p?.email ?? row.contact_email ?? null;
          row.children = childrenByParent.get(row.user_id) ?? [];
        }
      }
      setGuests(rows);
      setGuestsLoading(false);
    };
    void loadGuests();
    return () => { alive = false; };
  }, [activity?.id]);

  const updateGuestStatus = async (bookingId: string, status: BookingStatus) => {
    setGuests(prev => prev.map(g => g.id === bookingId ? { ...g, status } : g));
    const { error } = await supabase.from("bookings").update({ status, updated_at: new Date().toISOString() }).eq("id", bookingId);
    if (error) setGuests(prev => prev.map(g => g.id === bookingId ? { ...g, status: "pending" } : g));
  };

  const pendingCount = guests.filter(g => g.status === "pending").length;
  const waitlistedCount = guests.filter(g => g.status === "waitlisted").length;

  const filteredGuests = useMemo(() => {
    let list = statusFilter === "all" ? guests : guests.filter(g => g.status === statusFilter);
    if (guestSearch.trim()) {
      const q = guestSearch.toLowerCase();
      list = list.filter(g => {
        const names = [g.parentName, g.parentEmail, ...(g.children ?? []).map(c => c.name)].filter(Boolean).join(" ").toLowerCase();
        return names.includes(q);
      });
    }
    return list.slice().sort((a, b) => {
      const an = (a.children?.[0]?.name ?? a.parentName ?? "").toLowerCase();
      const bn = (b.children?.[0]?.name ?? b.parentName ?? "").toLowerCase();
      return an.localeCompare(bn);
    });
  }, [guests, statusFilter, guestSearch]);

  if (guestsLoading) {
    return <div className="py-10 text-center text-xs text-muted-foreground">Loading guests…</div>;
  }

  if (guests.length === 0) {
    return (
      <EmptyState
        icon="child_hat"
        iconBg="bg-yellow-300"
        iconColor="text-yellow-900"
        title="No guests yet"
        description="Once families book, you'll see them here. You can message them and manage your community all in one place."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Guests</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />Add guest
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Send className="h-3.5 w-3.5" />Send update
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input type="text" placeholder="Search" value={guestSearch} onChange={e => setGuestSearch(e.target.value)} className="pl-8" />
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
            <span>Alphabetical</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-2">
          {["all", "pending", "confirmed", "declined", "waitlisted"].map(s => (
            <button key={s} type="button" onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1 text-xs font-medium border transition-colors ${statusFilter === s ? "bg-foreground text-background border-foreground" : "bg-transparent text-muted-foreground border-input hover:bg-muted"}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {s === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
              {s === "waitlisted" && waitlistedCount > 0 ? ` (${waitlistedCount})` : ""}
            </button>
          ))}
        </div>

        {/* Guest rows */}
        {filteredGuests.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">No guests match your search.</div>
        ) : (
          <div className="divide-y divide-border">
            {filteredGuests.flatMap(g => {
              const isPending = g.status === "pending";
              const when = whenLabel(g.created_at);
              const kids = g.children && g.children.length > 0 ? g.children : null;
              const rows = kids
                ? kids.map(child => ({ key: `${g.id}-${child.id}`, name: child.name, sub: child.age != null ? `Age ${child.age}` : null, emoji: child.emoji }))
                : [{ key: g.id, name: g.parentName || g.parentEmail || g.contact_email || "Guest", sub: null, emoji: null }];

              return rows.map(({ key, name, sub, emoji }, ri) => {
                const initials = name.slice(0, 1).toUpperCase();
                const colors = ["bg-blue-100 text-blue-700", "bg-yellow-100 text-yellow-700", "bg-pink-100 text-pink-700", "bg-green-100 text-green-700", "bg-orange-100 text-orange-700", "bg-violet-100 text-violet-700", "bg-teal-100 text-teal-700"];
                const colorClass = colors[(name.charCodeAt(0) ?? 0) % colors.length];
                return (
                  <div key={key} className="flex items-center gap-3 py-3">
                    <Link href={`/host/activities/${activityId}/guests/${g.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${colorClass}`}>
                        {emoji ?? initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{name}</p>
                        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                      {isPending && ri === 0 ? (
                        <>
                          <button type="button" onClick={() => void updateGuestStatus(g.id, "declined")}
                            className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors">
                            Decline ×
                          </button>
                          <button type="button" onClick={() => void updateGuestStatus(g.id, "confirmed")}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
                            Approve ✓
                          </button>
                        </>
                      ) : ri === 0 ? (
                        <span className="text-xs text-muted-foreground">{when}</span>
                      ) : null}
                      {ri === 0 && (
                        <button type="button" onClick={() => router.push(`/host/activities/${activityId}/guests/${g.id}`)}
                          className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              });
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
