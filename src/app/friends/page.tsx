"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ShareCalendarModal } from "@/components/ShareCalendarModal";
import { FriendListItem, type FriendKid } from "@/components/FriendListItem";
import { QrCode } from "lucide-react";

/* ── Types ──────────────────────────────────────────────── */

type SharedCalendarRow = {
  id: string;
  created_at: string;
  accepted_at: string | null;
  sender_id: string | null;
  recipient_user_id: string | null;
  status: string;
  share_url: string;
  message: string | null;
  email: string;
};

type ProfileLite = {
  id: string;
  legal_name?: string | null;
  preferred_first_name?: string | null;
};

type ChildLite = {
  id: string;
  parent_id: string;
  legal_name: string | null;
  preferred_name: string | null;
  age_years: number | null;
};

type FriendRow = {
  shareId: string;
  senderId: string;
  profile: ProfileLite | null;
  kids: FriendKid[];
};

/* ── Helpers ─────────────────────────────────────────────── */

function displayName(p: ProfileLite | null): string {
  return p?.legal_name?.trim() || p?.preferred_first_name?.trim() || "Unknown";
}

function parseTime(s?: string | null) {
  if (!s) return 0;
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
}

function dedupeShares(rows: SharedCalendarRow[]) {
  const byKey = new Map<string, SharedCalendarRow>();
  for (const r of rows) {
    const key = r.sender_id ? `sender:${r.sender_id}` : `url:${r.share_url}`;
    const existing = byKey.get(key);
    if (!existing) { byKey.set(key, r); continue; }
    const existingScore = Math.max(parseTime(existing.accepted_at), parseTime(existing.created_at));
    const newScore = Math.max(parseTime(r.accepted_at), parseTime(r.created_at));
    if (newScore >= existingScore) byKey.set(key, r);
  }
  return Array.from(byKey.values()).sort((a, b) => {
    const aScore = Math.max(parseTime(a.accepted_at), parseTime(a.created_at));
    const bScore = Math.max(parseTime(b.accepted_at), parseTime(b.created_at));
    return bScore - aScore;
  });
}

/* ── Page ───────────────────────────────────────────────── */

export default function FriendsPage() {
  const router = useRouter();

  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) {
        setError("Please sign in to see your friends.");
        setLoading(false);
        return;
      }
      const userId = userRes.user.id;
      setMyUserId(userId);

      // 1. Load accepted shares where I'm the recipient
      const { data: shareData, error: shareErr } = await supabase
        .from("calendar_shares")
        .select("id, created_at, accepted_at, sender_id, recipient_user_id, status, share_url, message, email")
        .eq("recipient_user_id", userId)
        .in("status", ["accepted"])
        .order("accepted_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (shareErr) {
        setError("Could not load friends.");
        setLoading(false);
        return;
      }

      const rows = dedupeShares((shareData || []) as SharedCalendarRow[]);
      const senderIds = Array.from(
        new Set(rows.map((r) => r.sender_id).filter(Boolean) as string[])
      );

      if (senderIds.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // 2. Load profiles + children for all senders in parallel
      const [profileRes, childrenRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, legal_name, preferred_first_name")
          .in("id", senderIds),
        supabase
          .from("children")
          .select("id, parent_id, legal_name, preferred_name, age_years")
          .in("parent_id", senderIds)
          .order("age_years", { ascending: false }),
      ]);

      const profileMap: Record<string, ProfileLite> = {};
      (profileRes.data || []).forEach((p: any) => {
        if (p?.id) profileMap[p.id] = p as ProfileLite;
      });

      const kidsByParent: Record<string, FriendKid[]> = {};
      (childrenRes.data || []).forEach((c: any) => {
        const pid = c.parent_id as string;
        if (!kidsByParent[pid]) kidsByParent[pid] = [];
        kidsByParent[pid].push({
          name: (c.preferred_name?.trim() || c.legal_name?.trim() || "?") as string,
          age: typeof c.age_years === "number" ? c.age_years : null,
        });
      });

      const friendRows: FriendRow[] = rows
        .filter((r) => r.sender_id)
        .map((r) => ({
          shareId: r.id,
          senderId: r.sender_id!,
          profile: profileMap[r.sender_id!] ?? null,
          kids: kidsByParent[r.sender_id!] ?? [],
        }));

      setFriends(friendRows);
      setLoading(false);
    };

    void load();
  }, []);

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          My Friends
        </h1>
        <Button size="sm" variant="outline" onClick={() => setShareOpen(true)}>
          Add a friend
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Parents who have shared their calendars with you
        <span className="mx-1.5 opacity-40">|</span>
        See where you overlap with friends
      </p>

      {/* Main card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">

        {/* Invite banner */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/40 border-b border-border">
          <p className="text-sm text-foreground">
            Don&apos;t see someone you want on Wowzi?{" "}
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="font-medium text-primary hover:underline"
            >
              Invite them
            </button>{" "}
            using your share link.
          </p>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="shrink-0 h-9 w-9 flex items-center justify-center rounded-xl border border-border bg-background hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Share via QR / link"
          >
            <QrCode className="h-4 w-4" />
          </button>
        </div>

        {/* Section label */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            My friends
          </p>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="divide-y divide-border/50">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-32 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <p className="px-4 py-6 text-sm text-destructive">{error}</p>
        )}

        {/* Empty state */}
        {!loading && !error && friends.length === 0 && (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            </div>
            <p className="text-sm font-semibold text-foreground">No friends yet</p>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
              Invite a friend to share calendars and their activities will show up here.
            </p>
            <Button size="sm" className="mt-4" onClick={() => setShareOpen(true)}>
              Add a friend
            </Button>
          </div>
        )}

        {/* Friend list */}
        {!loading && !error && friends.length > 0 && (
          <div className="divide-y divide-border/50 pb-2">
            {friends.map((f) => (
              <FriendListItem
                key={f.shareId}
                name={displayName(f.profile)}
                kids={f.kids}
                onClick={() => router.push(`/friends/${encodeURIComponent(f.senderId)}`)}
                onMenuClick={(e) => {
                  e.stopPropagation();
                  // TODO: open context menu (remove friend, view calendar, etc.)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Share / invite modal */}
      {myUserId && (
        <ShareCalendarModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          userId={myUserId}
        />
      )}
    </main>
  );
}
