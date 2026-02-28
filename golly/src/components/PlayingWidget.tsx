"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/* ── types ──────────────────────────────────────────── */

type PlaySession = {
  id: string;
  user_id: string;
  location: string;
  status: string;
  created_at: string;
};

type Joiner = {
  user_id: string;
  name: string;
};

type WidgetState = "idle" | "picking" | "active" | "ending";

const PRESET_LOCATIONS = [
  { label: "At home", emoji: "\uD83C\uDFE0" },
  { label: "Oz Park", emoji: "\uD83C\uDF33" },
  { label: "Lincoln Park", emoji: "\uD83C\uDF33" },
  { label: "Millennium Park", emoji: "\uD83C\uDFD9\uFE0F" },
  { label: "Maggie Daley Park", emoji: "\uD83C\uDFD9\uFE0F" },
];

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

/* ── component ───────────────────────────────────────── */

export function PlayingWidget() {
  const [widgetState, setWidgetState] = useState<WidgetState>("idle");
  const [session, setSession] = useState<PlaySession | null>(null);
  const [joiners, setJoiners] = useState<Joiner[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Someone");

  /* location picker */
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customLocation, setCustomLocation] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const customRef = useRef<HTMLInputElement>(null);

  /* loading */
  const [saving, setSaving] = useState(false);
  const [ending, setEnding] = useState(false);

  /* ── load current user + active session on mount ── */
  useEffect(() => {
    const init = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;

      /* get display name */
      const { data: profile } = await supabase
        .from("profiles")
        .select("preferred_first_name, legal_name")
        .eq("id", uid)
        .single();
      const name =
        (profile as any)?.preferred_first_name?.trim() ||
        (profile as any)?.legal_name?.trim() ||
        "Someone";
      setUserName(name);

      /* check for active session */
      const { data: sessionData } = await supabase
        .from("play_sessions")
        .select("id, user_id, location, status, created_at")
        .eq("user_id", uid)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionData) {
        setSession(sessionData as PlaySession);
        setWidgetState("active");
        await loadJoiners((sessionData as PlaySession).id);
      }
    };
    void init();
  }, []);

  /* ── listen for header toggle trigger ── */
  useEffect(() => {
    const handler = () => {
      if (widgetState === "idle") setWidgetState("picking");
      else if (widgetState === "active") setWidgetState("ending");
      else if (widgetState === "ending") setWidgetState("active");
      else if (widgetState === "picking") setWidgetState("idle");
    };
    window.addEventListener("golly:toggle-play", handler);
    return () => window.removeEventListener("golly:toggle-play", handler);
  }, [widgetState]);

  /* ── dispatch play state changes to header ── */
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("golly:play-changed", {
        detail: { active: widgetState === "active" },
      })
    );
  }, [widgetState]);

  const loadJoiners = useCallback(async (sessionId: string) => {
    const { data: joins } = await supabase
      .from("play_joins")
      .select("user_id")
      .eq("session_id", sessionId);
    if (!joins || joins.length === 0) { setJoiners([]); return; }
    const joinerIds = joins.map((j: any) => j.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, preferred_first_name, legal_name")
      .in("id", joinerIds);
    const named: Joiner[] = (profiles || []).map((p: any) => ({
      user_id: p.id,
      name: p.preferred_first_name?.trim() || p.legal_name?.trim() || "Friend",
    }));
    setJoiners(named);
  }, []);

  /* ── get friends list (calendar_shares) ── */
  const getFriendIds = useCallback(async (): Promise<string[]> => {
    if (!userId) return [];
    const { data } = await supabase
      .from("calendar_shares")
      .select("sender_id, recipient_user_id")
      .or(`sender_id.eq.${userId},recipient_user_id.eq.${userId}`)
      .eq("status", "accepted");
    const ids = new Set<string>();
    for (const row of (data || []) as any[]) {
      if (row.sender_id && row.sender_id !== userId) ids.add(row.sender_id);
      if (row.recipient_user_id && row.recipient_user_id !== userId) ids.add(row.recipient_user_id);
    }
    return Array.from(ids);
  }, [userId]);

  /* ── notify friends ── */
  const notifyFriends = useCallback(
    async (friendIds: string[], type: string, title: string, body: string | null) => {
      if (!friendIds.length) return;
      const rows = friendIds.map((fid) => ({
        user_id: fid,
        type,
        title,
        body,
        is_read: false,
        meta: { icon: type === "play_started" ? "\uD83C\uDFC3" : type === "play_joined" ? "\uD83D\uDE4C" : "\uD83D\uDC4B" },
      }));
      await supabase.from("notifications").insert(rows);
    },
    []
  );

  /* ── start session ── */
  const handleStart = useCallback(async () => {
    const location = showCustom
      ? customLocation.trim()
      : selectedPreset ?? "";
    if (!location || !userId) return;

    setSaving(true);
    try {
      const { data: newSession, error } = await supabase
        .from("play_sessions")
        .insert({ user_id: userId, location, status: "active" })
        .select()
        .single();
      if (error || !newSession) { console.error("[playing] insert failed", error); return; }
      setSession(newSession as PlaySession);
      setWidgetState("active");

      /* notify friends */
      const friendIds = await getFriendIds();
      await notifyFriends(
        friendIds,
        "play_started",
        `${userName} is playing at ${location}!`,
        "Tap to join them."
      );
    } finally {
      setSaving(false);
    }
  }, [showCustom, customLocation, selectedPreset, userId, userName, getFriendIds, notifyFriends]);

  /* ── end session ── */
  const handleEnd = useCallback(async () => {
    if (!session || !userId) return;
    setEnding(true);
    try {
      await supabase
        .from("play_sessions")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", session.id);
      /* notify friends */
      const friendIds = await getFriendIds();
      await notifyFriends(
        friendIds,
        "play_ended",
        `${userName} wrapped up at ${session.location}`,
        null
      );
      setSession(null);
      setJoiners([]);
      setWidgetState("idle");
      setSelectedPreset(null);
      setCustomLocation("");
      setShowCustom(false);
    } finally {
      setEnding(false);
    }
  }, [session, userId, userName, getFriendIds, notifyFriends]);

  /* don't render if not logged in */
  if (!userId) return null;

  const activeLocation = session?.location ?? "";

  return (
    <>

      {/* ── Location picker modal ── */}
      {widgetState === "picking" && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setWidgetState("idle")}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-3xl border border-border shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">

              <div className="px-5 pt-5 pb-8 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">
                    Where are you playing?
                  </h2>
                  <button
                    type="button"
                    onClick={() => setWidgetState("idle")}
                    className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Preset chips */}
                <div className="flex flex-wrap gap-2">
                  {PRESET_LOCATIONS.map((loc) => {
                    const val = loc.label;
                    const selected = selectedPreset === val && !showCustom;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setSelectedPreset(val);
                          setShowCustom(false);
                          setCustomLocation("");
                        }}
                        className={`
                          rounded-full px-4 py-2 text-sm font-medium border transition-colors
                          ${selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 text-foreground border-border hover:bg-muted"
                          }
                        `}
                      >
                        {loc.emoji} {loc.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustom(true);
                      setSelectedPreset(null);
                      setTimeout(() => customRef.current?.focus(), 80);
                    }}
                    className={`
                      rounded-full px-4 py-2 text-sm font-medium border transition-colors
                      ${showCustom
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-foreground border-border hover:bg-muted"
                      }
                    `}
                  >
                    + Custom
                  </button>
                </div>

                {/* Custom input */}
                {showCustom && (
                  <div>
                    <input
                      ref={customRef}
                      type="text"
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") void handleStart(); }}
                      placeholder="Type a location..."
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void handleStart()}
                  disabled={saving || (!selectedPreset && !customLocation.trim())}
                  className="w-full rounded-2xl bg-emerald-500 text-white py-3.5 text-sm font-semibold hover:bg-emerald-600 disabled:opacity-40 transition-colors"
                >
                  {saving ? "Starting..." : "\uD83C\uDFC3 Go Playing!"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Active session / end confirm modal ── */}
      {widgetState === "ending" && session && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setWidgetState("active")}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-3xl border border-border shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">

              <div className="px-5 pt-5 pb-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">
                    You&apos;re playing at {session.location}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setWidgetState("active")}
                    className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Started {timeAgo(session.created_at)}
                </p>

                {/* Joiners */}
                {joiners.length > 0 && (
                  <div className="rounded-2xl bg-muted/40 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Joined ({joiners.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {joiners.map((j) => (
                        <span
                          key={j.user_id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-medium"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {j.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {joiners.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No one has joined yet. Your friends have been notified!
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void handleEnd()}
                  disabled={ending}
                  className="w-full rounded-2xl border border-destructive/30 bg-destructive/5 text-destructive py-3.5 text-sm font-semibold hover:bg-destructive/10 disabled:opacity-40 transition-colors"
                >
                  {ending ? "Ending..." : "\uD83D\uDC4B Done playing"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
