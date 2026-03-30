"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { UserAvatar } from "@/components/ui/UserAvatar";

/* ── types ──────────────────────────────────────────── */

type PlaySession = {
  id: string;
  user_id: string;
  location: string;
  status: string;
  created_at: string;
  ends_at: string | null;
};

type Friend = {
  user_id: string;
  name: string;
  location: string | null;
  ends_at: string | null;
  is_playing: boolean;
  updated_at: string | null;
};

type Tab = "status" | "peeps";
type View = "toggle" | "form" | "active";

/* ── helpers ─────────────────────────────────────────── */

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}

function formatTime(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function nowPlusHours(h: number) {
  const d = new Date();
  d.setHours(d.getHours() + h);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ── outlined text ───────────────────────────────────── */

function StatusWord({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color: string;   // hex
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block leading-none font-bold tracking-tight transition-all duration-200 cursor-pointer"
      style={{
        fontSize: "clamp(2.5rem, 10vw, 4rem)",
        color: active ? color : "transparent",
        WebkitTextStroke: active ? "none" : `2px ${color}`,
        opacity: 1,
        fontFamily: "var(--font-geist-sans, sans-serif)",
      }}
    >
      {label}
    </button>
  );
}

/* ── dot ─────────────────────────────────────────────── */
function Dot({ on }: { on: boolean }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
      style={{ background: on ? "#22c55e" : "#ef4444" }}
    />
  );
}

/* ── component ───────────────────────────────────────── */

export function PlayingWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("status");
  const [view, setView] = useState<View>("toggle");

  const [session, setSession] = useState<PlaySession | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("Someone");
  const [friends, setFriends] = useState<Friend[]>([]);

  /* form state */
  const [location, setLocation] = useState("");
  const [fromTime, setFromTime] = useState(() => nowPlusHours(0));
  const [toTime, setToTime] = useState(() => nowPlusHours(1));
  const [audience, setAudience] = useState<"friends" | "everyone">("everyone");

  /* loading */
  const [saving, setSaving] = useState(false);
  const [ending, setEnding] = useState(false);

  /* ── init ── */
  useEffect(() => {
    const init = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("preferred_first_name, legal_name")
        .eq("id", uid)
        .single();
      setUserName(
        (profile as any)?.preferred_first_name?.trim() ||
        (profile as any)?.legal_name?.trim() ||
        "Someone"
      );

      const { data: sessionData } = await supabase
        .from("play_sessions")
        .select("id, user_id, location, status, created_at, ends_at")
        .eq("user_id", uid)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionData) {
        setSession(sessionData as PlaySession);
        setView("active");
      }
    };
    void init();
  }, []);

  /* ── header toggle ── */
  useEffect(() => {
    const handler = () => setIsOpen((p) => !p);
    window.addEventListener("wowzi:toggle-play", handler);
    return () => window.removeEventListener("wowzi:toggle-play", handler);
  }, []);

  /* ── broadcast state to header ── */
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("wowzi:play-changed", { detail: { active: !!session } })
    );
  }, [session]);

  /* ── load friends + their status ── */
  const loadFriends = useCallback(async () => {
    if (!userId) return;
    const { data: shares } = await supabase
      .from("calendar_shares")
      .select("sender_id, recipient_user_id")
      .or(`sender_id.eq.${userId},recipient_user_id.eq.${userId}`)
      .eq("status", "accepted");

    const ids = new Set<string>();
    for (const row of (shares || []) as any[]) {
      if (row.sender_id !== userId) ids.add(row.sender_id);
      if (row.recipient_user_id !== userId) ids.add(row.recipient_user_id);
    }
    if (!ids.size) return;
    const idArr = Array.from(ids);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, preferred_first_name, legal_name")
      .in("id", idArr);

    const { data: sessions } = await supabase
      .from("play_sessions")
      .select("user_id, location, ends_at, status, created_at")
      .in("user_id", idArr)
      .eq("status", "active");

    const sessionMap = new Map((sessions || []).map((s: any) => [s.user_id, s]));

    const list: Friend[] = (profiles || []).map((p: any) => {
      const s = sessionMap.get(p.id);
      return {
        user_id: p.id,
        name: p.preferred_first_name?.trim() || p.legal_name?.trim() || "Friend",
        location: s?.location ?? null,
        ends_at: s?.ends_at ?? null,
        is_playing: !!s,
        updated_at: s?.created_at ?? null,
      };
    });

    // sort: playing first
    list.sort((a, b) => (b.is_playing ? 1 : 0) - (a.is_playing ? 1 : 0));
    setFriends(list);
  }, [userId]);

  useEffect(() => {
    if (isOpen && tab === "peeps") void loadFriends();
  }, [isOpen, tab, loadFriends]);

  /* ── friends helper ── */
  const getFriendIds = useCallback(async (): Promise<string[]> => {
    if (!userId) return [];
    const { data } = await supabase
      .from("calendar_shares")
      .select("sender_id, recipient_user_id")
      .or(`sender_id.eq.${userId},recipient_user_id.eq.${userId}`)
      .eq("status", "accepted");
    const ids = new Set<string>();
    for (const row of (data || []) as any[]) {
      if (row.sender_id !== userId) ids.add(row.sender_id);
      if (row.recipient_user_id !== userId) ids.add(row.recipient_user_id);
    }
    return Array.from(ids);
  }, [userId]);

  /* ── notify ── */
  const notifyFriends = useCallback(
    async (friendIds: string[], type: string, title: string, body: string | null) => {
      if (!friendIds.length) return;
      await supabase.from("notifications").insert(
        friendIds.map((fid) => ({
          user_id: fid, type, title, body, is_read: false,
          meta: { icon: type === "play_started" ? "🏃" : "👋" },
        }))
      );
    }, []
  );

  /* ── start ── */
  const handleStart = useCallback(async () => {
    if (!location.trim() || !userId) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const ends_at = toTime ? new Date(`${today}T${toTime}`).toISOString() : null;

      const { data: newSession, error } = await supabase
        .from("play_sessions")
        .insert({ user_id: userId, location: location.trim(), status: "active", ends_at, audience })
        .select()
        .single();

      if (error || !newSession) return;
      setSession(newSession as PlaySession);
      setView("active");

      const friendIds = await getFriendIds();
      const endLabel = ends_at ? ` until ${formatTime(ends_at)}` : "";
      await notifyFriends(friendIds, "play_started",
        `${userName} is playing at ${location.trim()}${endLabel}!`, "Tap to see.");
    } finally {
      setSaving(false);
    }
  }, [location, toTime, audience, userId, userName, getFriendIds, notifyFriends]);

  /* ── end ── */
  const handleEnd = useCallback(async () => {
    if (!session || !userId) return;
    setEnding(true);
    try {
      await supabase
        .from("play_sessions")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", session.id);
      const friendIds = await getFriendIds();
      await notifyFriends(friendIds, "play_ended",
        `${userName} wrapped up at ${session.location}`, null);
      setSession(null);
      setView("toggle");
      setLocation("");
    } finally {
      setEnding(false);
    }
  }, [session, userId, userName, getFriendIds, notifyFriends]);

  /* ── close ── */
  const close = () => setIsOpen(false);

  if (!userId || !isOpen) return null;

  const isPlaying = !!session;

  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={close} />

      {/* modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto bg-white rounded-3xl shadow-2xl w-full max-w-xs overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          style={{ minHeight: 480 }}
        >
          {/* header row */}
          <div className="flex items-center justify-end px-5 pt-5 pb-2">
            <button
              type="button"
              onClick={close}
              className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              ✕
            </button>
          </div>

          {/* ── STATUS TAB ── */}
          {tab === "status" && (
            <div className="flex flex-col px-6 pb-6" style={{ minHeight: 400 }}>

              {/* toggle view */}
              {view === "toggle" && (
                <div className="flex flex-col gap-1 mt-12 mb-auto">
                  <StatusWord
                    label="Playing"
                    active={isPlaying}
                    color="#0000FF"
                    onClick={() => { if (!isPlaying) setView("form"); }}
                  />
                  <StatusWord
                    label="Not playing"
                    active={!isPlaying}
                    color="#FF0000"
                    onClick={() => { if (isPlaying) void handleEnd(); }}
                  />
                </div>
              )}

              {/* active status banner */}
              {view === "active" && (
                <div className="flex flex-col gap-1 mt-12 mb-auto">
                  <StatusWord label="Playing" active={true} color="#0000FF" />
                  <StatusWord label="Not playing" active={false} color="#0000FF"
                    onClick={() => void handleEnd()} />
                  <div className="mt-8 text-center">
                    <p className="text-sm font-medium text-gray-700">
                      You are playing at {session?.location}
                      {session?.ends_at ? ` until ${formatTime(session.ends_at)}` : ""}
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => { setLocation(session?.location ?? ""); setView("form"); }}
                        className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        Change your plan
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleEnd()}
                        disabled={ending}
                        className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {ending ? "Stopping..." : "Stop Playing"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* form view */}
              {view === "form" && (
                <div className="mt-6 flex flex-col gap-4">
                  <button
                    type="button"
                    onClick={() => setView(isPlaying ? "active" : "toggle")}
                    className="self-start text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1"
                  >
                    ← Back
                  </button>
                  <h2 className="text-lg font-semibold text-gray-900">Whatchoo doing?</h2>

                  {/* location presets */}
                  <div className="flex flex-wrap gap-2">
                    {["Oz Park", "Lincoln Park", "Millennium Park", "Maggie Daley", "At home"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setLocation(p)}
                        className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                          location === p
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  {/* custom location */}
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Or type a location…"
                    className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-gray-400"
                  />

                  {/* time range */}
                  <div className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2">
                    <input
                      type="time"
                      value={fromTime}
                      onChange={(e) => setFromTime(e.target.value)}
                      className="bg-transparent text-sm text-gray-700 outline-none"
                    />
                    <span className="text-xs text-gray-400">to</span>
                    <input
                      type="time"
                      value={toTime}
                      onChange={(e) => setToTime(e.target.value)}
                      className="bg-transparent text-sm text-gray-700 outline-none"
                    />
                  </div>

                  {/* audience */}
                  <button
                    type="button"
                    onClick={() => setAudience((a) => a === "everyone" ? "friends" : "everyone")}
                    className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-700"
                  >
                    <span>{audience === "everyone" ? "Share with everyone" : "Friends only"}</span>
                    <span className="text-gray-400">👥</span>
                  </button>

                  {/* start button */}
                  <button
                    type="button"
                    onClick={() => void handleStart()}
                    disabled={saving || !location.trim()}
                    className="mt-2 w-full flex items-center justify-between rounded-2xl px-5 py-4 text-base font-semibold text-white disabled:opacity-40 transition-colors"
                    style={{ background: "#00c41c" }}
                  >
                    <span>Start playing</span>
                    <span className="h-8 w-8 rounded-full bg-black/20 flex items-center justify-center text-sm">▶</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── PEEPS TAB ── */}
          {tab === "peeps" && (
            <div className="px-4 pb-6 flex flex-col gap-0" style={{ minHeight: 400 }}>
              {/* you */}
              {isPlaying && session && (
                <div className="flex items-center gap-3 py-3 border-b border-gray-100">
                  <UserAvatar name={userName} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">You</p>
                    <p className="text-xs text-gray-500 truncate">
                      Playing at {session.location}
                      {session.ends_at ? ` from ${formatTime(session.created_at)}–${formatTime(session.ends_at)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    {session.created_at && <span>{timeAgo(session.created_at)}</span>}
                    <Dot on={true} />
                  </div>
                </div>
              )}

              {/* friends */}
              {friends.map((f) => (
                <div key={f.user_id} className="flex items-center gap-3 py-3 border-b border-gray-100">
                  <UserAvatar name={f.name} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{f.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {f.is_playing && f.location ? f.location : "Not playing"}
                    </p>
                  </div>
                  <Dot on={f.is_playing} />
                </div>
              ))}

              {friends.length === 0 && (
                <p className="mt-6 text-center text-xs text-gray-400">No peeps yet.</p>
              )}

              {/* invite row */}
              <div className="mt-auto pt-4 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Don&apos;t see someone you want?{" "}
                  <button type="button" className="text-orange-500 font-medium">Invite them</button>
                  {" "}using your QR Code.
                </p>
                <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 text-xs">
                  ▦
                </div>
              </div>
            </div>
          )}

          {/* ── bottom nav ── */}
          <div className="border-t border-gray-100 flex items-center justify-around px-8 py-3">
            <button
              type="button"
              onClick={() => setTab("status")}
              className={`flex flex-col items-center transition-opacity ${tab === "status" ? "opacity-100" : "opacity-30"}`}
            >
              <span className="material-symbols-rounded select-none" style={{ fontSize: 24 }}>radio_button_checked</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("peeps")}
              className={`flex flex-col items-center transition-opacity ${tab === "peeps" ? "opacity-100" : "opacity-30"}`}
            >
              <span className="material-symbols-rounded select-none" style={{ fontSize: 24 }}>cruelty_free</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
