"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function MessagesPageWrapper() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-4 py-8 text-sm text-muted-foreground">Loading messages...</div>}>
      <MessagesPageInner />
    </Suspense>
  );
}

/* ── types ─────────────────────────────────────────────── */

type Conversation = {
  id: string;
  participant_name: string | null;
  avatar_emoji: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  participant_profile_id: string | null;
  camp_slug: string | null;
  camp_name: string | null;
};

type Message = {
  id: string;
  conversation_id: string;
  sender: "user" | "them";
  body: string;
  created_at: string;
  image_url: string | null;
};

/* ── helpers ───────────────────────────────────────────── */

const isMock = (id: string) => id.startsWith("mock-");
const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

function relTime(iso?: string | null) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "Now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

function sortConvs(c: Conversation[]) {
  return [...c].sort(
    (a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
  );
}

/* ── page ──────────────────────────────────────────────── */

function MessagesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Capture initial URL params once — never re-read them to avoid jump
  const initialCParam = useRef(searchParams.get("c")).current;
  const initialToProfileId = useRef(searchParams.get("to")).current;

  const [authedUserId, setAuthedUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, Message[]>>({});
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = useMemo(
    () => (activeConvId ? conversations.find((c) => c.id === activeConvId) ?? null : null),
    [activeConvId, conversations]
  );
  const activeMessages = useMemo(
    () => (activeConvId ? messagesByConv[activeConvId] ?? [] : []),
    [messagesByConv, activeConvId]
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

  // Load conversations — runs ONCE on mount using captured initial params
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: userRes } = await supabase.auth.getUser();
        if (!userRes.user) {
          router.replace("/");
          return;
        }
        const myId = userRes.user.id;
        setAuthedUserId(myId);

        const { data: convData, error: convError } = await supabase
          .from("conversations")
          .select("id, participant_name, avatar_emoji, last_message_preview, last_message_at, unread_count, participant_profile_id, camp_slug, camp_name")
          .eq("user_id", myId)
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .limit(50);

        if (convError) throw convError;
        const convs = (convData ?? []) as Conversation[];

        if (convs.length === 0) {
          setConversations([]);
          setMessagesByConv({});
          setActiveConvId(null);
          setLoading(false);
          return;
        }

        setConversations(sortConvs(convs));

        const convIds = convs.map((c) => c.id);
        const { data: msgData, error: msgError } = await supabase
          .from("messages")
          .select("id, conversation_id, sender, body, created_at, image_url")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: true })
          .limit(1200);

        if (msgError) {
          console.error("[messages] Failed to load messages:", msgError.message);
        }

        const map: Record<string, Message[]> = {};
        (msgData ?? []).forEach((m: any) => {
          const cid = String(m.conversation_id);
          if (!map[cid]) map[cid] = [];
          map[cid].push({
            id: m.id,
            conversation_id: cid,
            sender: m.sender === "user" ? "user" : "them",
            body: m.body ?? "",
            created_at: m.created_at,
            image_url: m.image_url || null,
          });
        });
        setMessagesByConv(map);

        // Use initial URL params for first selection — avoids re-render loop
        const target = initialCParam && isUuid(initialCParam) ? initialCParam : convs[0]?.id ?? null;
        setActiveConvId(target);
        setMobileView(initialCParam || initialToProfileId ? "thread" : "list");
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || "Could not load messages.");
        setConversations([]);
        setMessagesByConv({});
        setActiveConvId(null);
        setLoading(false);
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — runs once on mount

  // Select conversation without triggering a re-render via router
  const handleSelectConversation = (id: string) => {
    setActiveConvId(id);
    setMobileView("thread");
    // Use replaceState instead of router.replace to avoid re-running the load effect
    if (!isMock(id)) {
      window.history.replaceState(null, "", `/messages?c=${encodeURIComponent(id)}`);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvId) return;
    const body = draftText.trim();
    if (!body) return;

    const optimistic: Message = {
      id: `local-${Date.now()}`,
      conversation_id: activeConvId,
      sender: "user",
      body,
      created_at: new Date().toISOString(),
      image_url: null,
    };

    setMessagesByConv((prev) => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] ?? []), optimistic],
    }));
    setConversations((prev) =>
      sortConvs(
        prev.map((c) =>
          c.id === activeConvId
            ? { ...c, last_message_preview: body.slice(0, 140), last_message_at: optimistic.created_at }
            : c
        )
      )
    );
    setDraftText("");
    setSending(true);

    if (isMock(activeConvId)) {
      setSending(false);
      return;
    }

    try {
      const conv = activeConv;
      const toId = conv?.participant_profile_id;
      if (!toId || !isUuid(toId)) throw new Error("Could not determine recipient.");

      const { data, error: fnErr } = await supabase.functions.invoke("send-message", {
        body: { to_profile_id: toId, body, image_url: null },
      });
      if (fnErr) throw fnErr;
      if (!(data as any)?.ok) throw new Error((data as any)?.error || "Failed to send.");
    } catch (err: any) {
      setError(err?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  /* ── conversation list ──────────────────────────────── */
  const ConversationListUI = (
    <div className="rounded-2xl bg-card border border-border/50 overflow-hidden h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border/50">
        <h2 className="text-sm font-semibold text-foreground">Conversations</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="px-4 py-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 bg-muted rounded" />
                  <div className="h-2.5 w-40 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && conversations.length === 0 && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">No conversations yet.</p>
          </div>
        )}
        {conversations.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => handleSelectConversation(c.id)}
            className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0 ${
              activeConvId === c.id ? "bg-primary/5" : ""
            }`}
          >
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
              {c.avatar_emoji || (c.participant_name?.[0] ?? "?")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground truncate">{c.participant_name || "Unknown"}</p>
                <span className="text-[11px] text-muted-foreground shrink-0">{relTime(c.last_message_at)}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {c.last_message_preview || "No messages yet"}
              </p>
            </div>
            {c.unread_count > 0 && (
              <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-medium shrink-0">
                {c.unread_count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  /* ── message thread ─────────────────────────────────── */
  const ThreadUI = (
    <div className="rounded-2xl bg-card border border-border/50 overflow-hidden h-full flex flex-col">
      {/* Thread header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileView("list")}
          className="lg:hidden shrink-0 rounded-full border border-input bg-transparent px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
        >
          ← Back
        </button>
        {activeConv ? (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{activeConv.participant_name}</p>
            {activeConv.camp_name && (
              <p className="text-[11px] text-muted-foreground truncate">{activeConv.camp_name}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Select a conversation</p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {activeMessages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground text-center">
              {activeConv ? "No messages yet. Start the conversation!" : "Select a conversation"}
            </p>
          </div>
        )}
        {activeMessages.map((m) => {
          const isUser = m.sender === "user";
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  isUser
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                <p className="leading-relaxed">{m.body}</p>
                {m.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.image_url} alt="" className="mt-2 rounded-lg max-h-48 object-cover" />
                )}
                <p className={`text-[10px] mt-1.5 ${isUser ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="px-4 py-3 border-t border-border/50">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <Textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder={activeConv ? `Message ${activeConv.participant_name}…` : "Select a conversation"}
            rows={1}
            disabled={!activeConvId}
            className="flex-1 min-h-[40px] max-h-[120px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend(e);
              }
            }}
          />
          <Button type="submit" size="sm" disabled={!draftText.trim() || sending || !activeConvId}>
            {sending ? "…" : "Send"}
          </Button>
        </form>
      </div>
    </div>
  );

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-5">
        Messages
      </h1>

      {error && (
        <div className="mb-4 rounded-xl bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="h-[calc(100vh-11rem)] max-h-[740px]">
        {/* Desktop: side-by-side */}
        <div className="hidden lg:grid grid-cols-[minmax(0,300px)_minmax(0,1fr)] gap-4 h-full">
          {ConversationListUI}
          {ThreadUI}
        </div>

        {/* Mobile: list or thread */}
        <div className="lg:hidden h-full">
          {mobileView === "list" ? ConversationListUI : ThreadUI}
        </div>
      </div>
    </main>
  );
}
