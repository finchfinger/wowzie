"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/* ── types ──────────────────────────────────────────── */

type PlaySession = {
  id: string;
  user_id: string;
  location: string;
  created_at: string;
};

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

/* ── helpers ────────────────────────────────────────── */

function bestName(p?: ProfileLite | null) {
  return p?.preferred_first_name?.trim() || p?.legal_name?.trim() || null;
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

function formatDateShort(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

/* ── page ───────────────────────────────────────────── */

export default function FriendsPage() {
  const router = useRouter();

  const [items, setItems] = useState<SharedCalendarRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myUserName, setMyUserName] = useState<string>("Someone");

  /* play sessions */
  const [activeSessions, setActiveSessions] = useState<PlaySession[]>([]);
  const [sessionProfiles, setSessionProfiles] = useState<Record<string, ProfileLite>>({});
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // Share modal state
  const [shareEmail, setShareEmail] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

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

      /* get my display name */
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("preferred_first_name, legal_name")
        .eq("id", userId)
        .single();
      const myName =
        (myProfile as any)?.preferred_first_name?.trim() ||
        (myProfile as any)?.legal_name?.trim() ||
        "Someone";
      setMyUserName(myName);

      const { data, error: qErr } = await supabase
        .from("calendar_shares")
        .select("id, created_at, accepted_at, sender_id, recipient_user_id, status, share_url, message, email")
        .eq("recipient_user_id", userId)
        .in("status", ["accepted"])
        .order("accepted_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (qErr) {
        setError("Could not load friends.");
        setItems([]);
        setLoading(false);
        return;
      }

      const rows = dedupeShares((data || []) as SharedCalendarRow[]);
      setItems(rows);

      // Load sender profiles
      const senderIds = Array.from(new Set(rows.map((r) => r.sender_id).filter(Boolean) as string[]));
      if (senderIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, legal_name, preferred_first_name")
          .in("id", senderIds);
        if (profileData) {
          const map: Record<string, ProfileLite> = {};
          profileData.forEach((p: any) => { if (p?.id) map[p.id] = p as ProfileLite; });
          setProfiles(map);
        }

        /* load active play sessions for friends */
        const { data: sessionData } = await supabase
          .from("play_sessions")
          .select("id, user_id, location, created_at")
          .in("user_id", senderIds)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (sessionData && sessionData.length > 0) {
          setActiveSessions(sessionData as PlaySession[]);
          /* profiles already loaded above */
          const spMap: Record<string, ProfileLite> = {};
          (profileData || []).forEach((p: any) => { if (p?.id) spMap[p.id] = p as ProfileLite; });
          setSessionProfiles(spMap);
        }
      }

      setLoading(false);
    };
    void load();
  }, []);

  const handleJoin = async (session: PlaySession) => {
    if (!myUserId || joiningId) return;
    setJoiningId(session.id);
    try {
      await supabase
        .from("play_joins")
        .upsert({ session_id: session.id, user_id: myUserId }, { ignoreDuplicates: true });

      /* notify session owner */
      const ownerProfile = sessionProfiles[session.user_id];
      const ownerName = bestName(ownerProfile) || "your friend";
      await supabase.from("notifications").insert({
        user_id: session.user_id,
        type: "play_joined",
        title: `${myUserName} is joining you at ${session.location}!`,
        body: null,
        is_read: false,
        meta: { icon: "\uD83D\uDE4C" },
      });

      /* optimistically remove from list so button can't be double-tapped */
      setActiveSessions((prev) => prev.filter((s) => s.id !== session.id));
    } finally {
      setJoiningId(null);
    }
  };

  const handleShare = async () => {
    const email = shareEmail.trim();
    if (!email || !email.includes("@")) {
      setShareStatus("Please enter a valid email.");
      return;
    }
    setSharing(true);
    setShareStatus(null);
    try {
      const { error: fnErr } = await supabase.functions.invoke("share-calendar", {
        body: { mode: "send", email, message: shareMessage.trim() || null },
      });
      if (fnErr) {
        setShareStatus("Could not send invite. Please try again.");
        return;
      }
      setShareStatus("Invite sent!");
      setShareEmail("");
      setShareMessage("");
      setTimeout(() => { setShareOpen(false); setShareStatus(null); }, 800);
    } catch {
      setShareStatus("Could not send invite.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            My Friends
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            People who&apos;ve shared their calendar with you.
          </p>
        </div>
        <Button size="sm" onClick={() => setShareOpen(true)}>
          Invite a friend
        </Button>
      </div>

      {/* ── Active play sessions ── */}
      {activeSessions.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Active right now
          </p>
          <div className="space-y-2">
            {activeSessions.map((session) => {
              const profile = sessionProfiles[session.user_id];
              const name = bestName(profile) || "A friend";
              const isJoining = joiningId === session.id;
              return (
                <div
                  key={session.id}
                  className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3"
                >
                  <span className="text-xl shrink-0">\uD83C\uDFD3</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-900 truncate">
                      {name} is playing at {session.location}
                    </p>
                    <p className="text-xs text-emerald-700">
                      {timeAgo(session.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleJoin(session)}
                    disabled={isJoining}
                    className="shrink-0 rounded-full bg-emerald-500 text-white px-4 py-1.5 text-xs font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                  >
                    {isJoining ? "Joining..." : "Join them!"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-2xl px-6 py-10 text-center">
          <div className="text-2xl mb-3">😌</div>
          <p className="text-sm font-medium text-foreground">Looks a little quiet here</p>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            Friends will appear here once another host or parent shares their calendar with you.
          </p>
          <Button size="sm" className="mt-5" onClick={() => setShareOpen(true)}>
            Invite a friend
          </Button>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map((row) => {
            const profile = row.sender_id ? profiles[row.sender_id] : null;
            const name = bestName(profile);
            const title = name || "Friend";
            const addedOn = formatDateShort(row.accepted_at || row.created_at);

            return (
              <button
                key={row.id}
                type="button"
                onClick={() => {
                  if (row.sender_id) {
                    router.push(`/friends/${encodeURIComponent(row.sender_id)}`);
                  }
                }}
                className="w-full rounded-2xl px-4 py-3 flex items-center gap-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg shrink-0">
                  {name ? name[0].toUpperCase() : "📅"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {title}&apos;s calendar
                  </p>
                  {addedOn && (
                    <p className="text-xs text-muted-foreground">Added on {addedOn}</p>
                  )}
                  {row.message && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{row.message}</p>
                  )}
                </div>
                <span className="text-muted-foreground text-xs shrink-0">&#8250;</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Share modal */}
      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={(e) => { if (e.target === e.currentTarget) setShareOpen(false); }}>
          <div className="relative w-full max-w-md rounded-3xl bg-card shadow-xl">
            <button type="button" onClick={() => { setShareOpen(false); setShareStatus(null); }} className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80">&#10005;</button>

            <div className="px-6 pt-8 pb-6 space-y-5">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Share your calendar
              </h2>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                <Input value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} placeholder="friend@email.com" type="email" disabled={sharing} />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Message (optional)</label>
                <Textarea value={shareMessage} onChange={(e) => setShareMessage(e.target.value)} rows={3} placeholder="Add a note" disabled={sharing} />
              </div>

              {shareStatus && (
                <p className={`text-xs ${shareStatus.includes("sent") ? "text-green-600" : "text-destructive"}`}>
                  {shareStatus}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => { setShareOpen(false); setShareStatus(null); }}>Cancel</Button>
                <Button size="sm" onClick={handleShare} disabled={sharing}>
                  {sharing ? "Sending..." : "Send invite"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
