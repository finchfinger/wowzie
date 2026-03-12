"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
  MoreVertical,
  Send,
  Smile,
  Paperclip,
  ImageIcon,
  ArrowLeft,
  X,
  FileText,
} from "lucide-react";
import { format, isToday, isYesterday, isSameDay, parseISO } from "date-fns";

export default function MessagesPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-4 py-8 text-sm text-muted-foreground">
          Loading messages…
        </div>
      }
    >
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

type MessageGroup = {
  dateLabel: string;
  date: Date;
  messages: Message[];
};

type PendingMedia = {
  file: File;
  previewUrl: string;
  uploadedUrl: string | null;
  uploading: boolean;
  isImage: boolean;
};

/* ── helpers ───────────────────────────────────────────── */

const isMock = (id: string) => id.startsWith("mock-");
const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "svg"]);

function isImageUrl(url: string) {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTS.has(ext);
}
function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

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

function msgTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function sortConvs(c: Conversation[]) {
  return [...c].sort(
    (a, b) =>
      new Date(b.last_message_at || 0).getTime() -
      new Date(a.last_message_at || 0).getTime()
  );
}

function groupMessagesByDate(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  for (const msg of messages) {
    const msgDate = parseISO(msg.created_at);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && isSameDay(msgDate, lastGroup.date)) {
      lastGroup.messages.push(msg);
    } else {
      let label: string;
      if (isToday(msgDate)) label = "Today";
      else if (isYesterday(msgDate)) label = "Yesterday";
      else label = format(msgDate, "MMMM d");
      groups.push({ dateLabel: label, date: msgDate, messages: [msg] });
    }
  }
  return groups;
}

/* ── emoji list ────────────────────────────────────────── */

const EMOJIS = [
  "😀","😂","😍","🥰","😊","😎","😢","😮","😡","🤔","😴","🤩","🥳","🤗","😇",
  "❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","❤️‍🔥","💕","💖","💗","💓","💞",
  "👍","👎","👋","🤝","🙏","👏","🤞","✌️","🤙","💪","✋","🫶","🫂","🤲","🫰",
  "🌸","🌺","🌻","🌹","🍀","🌈","☀️","⭐","🌙","🔥","🌊","🌿","🌵","🎋","🍁",
  "🍕","🍔","🌮","🍎","🍊","🍋","🍇","🍓","🧁","🍩","🍦","🥑","🍜","🍣","🧃",
  "⚽","🏀","🎮","🎵","🎸","🎉","🎊","🎁","🏆","💯","✅","🔮","🎯","🧩","🎪",
  "🐶","🐱","🐼","🐨","🦁","🐯","🦊","🐻","🐸","🦋","🐳","🦄","🐧","🦉","🐢",
];

/* ── upload helper ─────────────────────────────────────── */

async function uploadToStorage(file: File, userId: string): Promise<string | null> {
  try {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const baseName = file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9\-_]/gi, "_")
      .slice(0, 40);
    const path = `${userId}/${Date.now()}-${baseName}.${ext}`;

    const { error } = await supabase.storage
      .from("message-attachments")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) {
      console.error("[uploadToStorage]", error.message);
      return null;
    }

    const { data } = supabase.storage.from("message-attachments").getPublicUrl(path);
    return data.publicUrl ?? null;
  } catch (e) {
    console.error("[uploadToStorage] exception:", e);
    return null;
  }
}

/* ── page ──────────────────────────────────────────────── */

function MessagesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCParam = useRef(searchParams.get("c")).current;
  const initialToProfileId = useRef(searchParams.get("to")).current;
  const initialCampSlug = useRef(searchParams.get("campSlug")).current;
  const initialCampName = useRef(searchParams.get("campName")).current;
  const initialHostName = useRef(searchParams.get("hostName")).current;

  const [authedUserId, setAuthedUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, Message[]>>({});
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "error">(
    "connecting"
  );
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const convIdsRef = useRef<Set<string>>(new Set());
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeConv = useMemo(
    () => (activeConvId ? conversations.find((c) => c.id === activeConvId) ?? null : null),
    [activeConvId, conversations]
  );
  const activeMessages = useMemo(
    () => (activeConvId ? messagesByConv[activeConvId] ?? [] : []),
    [messagesByConv, activeConvId]
  );
  const messageGroups = useMemo(() => groupMessagesByDate(activeMessages), [activeMessages]);

  // Sync convIdsRef
  useEffect(() => {
    convIdsRef.current = new Set(conversations.map((c) => c.id));
  }, [conversations]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!emojiPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setEmojiPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [emojiPickerOpen]);

  // Load conversations — once on mount
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
          .select(
            "id, participant_name, avatar_emoji, last_message_preview, last_message_at, unread_count, participant_profile_id, camp_slug, camp_name"
          )
          .eq("user_id", myId)
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .limit(50);

        if (convError) throw convError;
        const convs = (convData ?? []) as Conversation[];

        // Clear all unread counts when the messages page is opened.
        // This makes the header badge disappear and clears per-conversation badges.
        // The header's realtime subscription picks up the DB updates automatically.
        const unreadIds = convs.filter((c) => (c.unread_count ?? 0) > 0).map((c) => c.id);
        if (unreadIds.length > 0) {
          void supabase.from("conversations").update({ unread_count: 0 }).in("id", unreadIds);
        }
        // Zero out locally so UI updates instantly (no waiting for realtime round-trip)
        const clearedConvs: Conversation[] = convs.map((c) => ({ ...c, unread_count: 0 }));

        if (initialToProfileId) {
          const existing = clearedConvs.find((c) => c.participant_profile_id === initialToProfileId);
          if (existing) {
            setConversations(sortConvs(clearedConvs));
            setActiveConvId(existing.id);
            setMobileView("thread");
            setLoading(false);
            return;
          }
          const { data: created } = await supabase
            .from("conversations")
            .insert({
              user_id: myId,
              participant_profile_id: initialToProfileId,
              participant_name: initialHostName ?? null,
              camp_slug: initialCampSlug ?? null,
              camp_name: initialCampName ?? null,
              type: "dm",
              unread_count: 0,
            })
            .select(
              "id, participant_name, avatar_emoji, last_message_preview, last_message_at, unread_count, participant_profile_id, camp_slug, camp_name"
            )
            .single();
          if (created) {
            const newConvs = sortConvs([created as Conversation, ...clearedConvs]);
            setConversations(newConvs);
            setMessagesByConv((prev) => ({ ...prev, [created.id]: [] }));
            setActiveConvId(created.id);
            setMobileView("thread");
            window.history.replaceState(null, "", `/messages?c=${encodeURIComponent(created.id)}`);
            setLoading(false);
            return;
          }
        }

        if (convs.length === 0) {
          setConversations([]);
          setMessagesByConv({});
          setActiveConvId(null);
          setLoading(false);
          return;
        }

        setConversations(sortConvs(clearedConvs));

        const convIds = clearedConvs.map((c) => c.id);
        const { data: msgData, error: msgError } = await supabase
          .from("messages")
          .select("id, conversation_id, sender, body, created_at, image_url")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: true })
          .limit(1200);

        if (msgError) console.error("[messages] Failed to load messages:", msgError.message);

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

        const target =
          initialCParam && isUuid(initialCParam) ? initialCParam : convs[0]?.id ?? null;
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
  }, []);

  // Realtime subscriptions
  useEffect(() => {
    if (!authedUserId) return;

    const channel = supabase
      .channel(`messages-realtime-${authedUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as any;
          const cid = String(msg.conversation_id);
          if (!convIdsRef.current.has(cid)) return;

          const newMsg: Message = {
            id: msg.id,
            conversation_id: cid,
            sender: msg.sender === "user" ? "user" : "them",
            body: msg.body ?? "",
            created_at: msg.created_at,
            image_url: msg.image_url || null,
          };

          setMessagesByConv((prev) => {
            const existing = prev[cid] ?? [];
            if (existing.some((m) => m.id === newMsg.id)) return prev;
            if (newMsg.sender === "user") {
              const withoutOptimistic = existing.filter(
                (m) =>
                  !(m.id.startsWith("local-") && m.body === newMsg.body && m.sender === "user")
              );
              return { ...prev, [cid]: [...withoutOptimistic, newMsg] };
            }
            return { ...prev, [cid]: [...existing, newMsg] };
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `user_id=eq.${authedUserId}`,
        },
        (payload) => {
          const updated = payload.new as Conversation;
          setConversations((prev) =>
            sortConvs(prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversations",
          filter: `user_id=eq.${authedUserId}`,
        },
        (payload) => {
          const newConv = payload.new as Conversation;
          convIdsRef.current.add(newConv.id);
          setConversations((prev) => sortConvs([...prev, newConv]));
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeStatus("connected");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setRealtimeStatus("error");
        else setRealtimeStatus("connecting");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authedUserId]);

  /* ── handlers ─────────────────────────────────────────── */

  const handleSelectConversation = (id: string) => {
    setActiveConvId(id);
    setMobileView("thread");
    const conv = conversations.find((c) => c.id === id);
    if (conv && conv.unread_count > 0) {
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)));
      if (!isMock(id)) void supabase.from("conversations").update({ unread_count: 0 }).eq("id", id);
    }
    if (!isMock(id)) window.history.replaceState(null, "", `/messages?c=${encodeURIComponent(id)}`);
  };

  const handleEmojiSelect = (emoji: string) => {
    setDraftText((prev) => prev + emoji);
    setEmojiPickerOpen(false);
    textareaRef.current?.focus();
  };

  const handleFileSelected = async (file: File) => {
    if (!authedUserId) return;
    const isImg = isImageFile(file);
    const previewUrl = isImg ? URL.createObjectURL(file) : "";
    setPendingMedia({ file, previewUrl, uploadedUrl: null, uploading: true, isImage: isImg });
    const uploadedUrl = await uploadToStorage(file, authedUserId);
    setPendingMedia((prev) => (prev ? { ...prev, uploadedUrl, uploading: false } : null));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    void handleFileSelected(file);
  };

  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    void handleFileSelected(file);
  };

  const removePendingMedia = () => {
    if (pendingMedia?.previewUrl) URL.revokeObjectURL(pendingMedia.previewUrl);
    setPendingMedia(null);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!activeConvId) return;
    const body = draftText.trim();
    const imageUrl = pendingMedia?.uploadedUrl ?? null;
    if (!body && !imageUrl) return;
    if (pendingMedia?.uploading) return; // wait for upload to finish

    const optimistic: Message = {
      id: `local-${Date.now()}`,
      conversation_id: activeConvId,
      sender: "user",
      body,
      created_at: new Date().toISOString(),
      image_url: imageUrl,
    };

    setMessagesByConv((prev) => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] ?? []), optimistic],
    }));
    setConversations((prev) =>
      sortConvs(
        prev.map((c) =>
          c.id === activeConvId
            ? {
                ...c,
                last_message_preview: body.slice(0, 140) || "📎 Attachment",
                last_message_at: optimistic.created_at,
              }
            : c
        )
      )
    );
    setDraftText("");
    if (pendingMedia?.previewUrl) URL.revokeObjectURL(pendingMedia.previewUrl);
    setPendingMedia(null);
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setSending(true);

    if (isMock(activeConvId)) {
      setSending(false);
      return;
    }

    try {
      const toId = activeConv?.participant_profile_id;
      if (!toId || !isUuid(toId)) throw new Error("Could not determine recipient.");

      const { data, error: fnErr } = await supabase.functions.invoke("send-message", {
        body: { to_profile_id: toId, body, image_url: imageUrl },
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
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Messages</h2>
        {!loading && authedUserId && (
          <span
            title={
              realtimeStatus === "connected"
                ? "Live updates on"
                : realtimeStatus === "error"
                ? "Connection error"
                : "Connecting…"
            }
            className={`h-2 w-2 rounded-full transition-colors ${
              realtimeStatus === "connected"
                ? "bg-emerald-500"
                : realtimeStatus === "error"
                ? "bg-red-500"
                : "bg-amber-400 animate-pulse"
            }`}
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="px-4 py-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-28 bg-gray-200 rounded" />
                  <div className="h-2.5 w-44 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && conversations.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-gray-400">No conversations yet.</p>
          </div>
        )}
        {conversations.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => handleSelectConversation(c.id)}
            className={`w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${
              activeConvId === c.id ? "bg-violet-50" : ""
            }`}
          >
            <UserAvatar
              name={c.avatar_emoji ?? c.participant_name ?? "?"}
              size={42}
              className="shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`text-sm truncate ${
                    c.unread_count > 0
                      ? "font-semibold text-gray-900"
                      : "font-medium text-gray-800"
                  }`}
                >
                  {c.participant_name || "Unknown"}
                </p>
                <span className="text-[11px] text-gray-400 shrink-0">
                  {relTime(c.last_message_at)}
                </span>
              </div>
              <p
                className={`text-xs truncate mt-0.5 ${
                  c.unread_count > 0 ? "text-gray-700 font-medium" : "text-gray-400"
                }`}
              >
                {c.last_message_preview || "No messages yet"}
              </p>
            </div>
            {c.unread_count > 0 && (
              <span className="h-5 w-5 rounded-full bg-violet-500 text-white text-[10px] flex items-center justify-center font-semibold shrink-0">
                {c.unread_count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  /* ── thread UI ──────────────────────────────────────── */

  const canSend =
    (!!draftText.trim() || !!pendingMedia?.uploadedUrl) &&
    !!activeConvId &&
    !pendingMedia?.uploading &&
    !sending;

  const ThreadUI = (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">

      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileView("list")}
          className="lg:hidden shrink-0 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {activeConv ? (
          <>
            <UserAvatar
              name={activeConv.participant_name ?? "?"}
              size={36}
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {activeConv.participant_name}
              </p>
              {activeConv.camp_name && (
                <p className="text-[11px] text-gray-400 truncate">{activeConv.camp_name}</p>
              )}
            </div>
            <button
              type="button"
              className="shrink-0 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </>
        ) : (
          <p className="text-sm text-gray-400">Select a conversation</p>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {activeMessages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400 text-center">
              {activeConv ? "No messages yet. Say hello! 👋" : "Select a conversation to start messaging"}
            </p>
          </div>
        )}

        {messageGroups.map((group) => (
          <div key={`${group.dateLabel}-${group.date.toISOString()}`}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[11px] text-gray-400 font-medium px-2 shrink-0">
                {group.dateLabel}
              </span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Messages */}
            <div className="space-y-3">
              {group.messages.map((m) => {
                const isUser = m.sender === "user";
                const isOptimistic = m.id.startsWith("local-");
                const showAsImage = !!m.image_url && isImageUrl(m.image_url);
                const showAsFile = !!m.image_url && !isImageUrl(m.image_url);
                const senderName = isUser ? "You" : (activeConv?.participant_name ?? "Them");

                return (
                  <div
                    key={m.id}
                    className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {/* Incoming avatar */}
                    {!isUser && (
                      <UserAvatar
                        name={activeConv?.participant_name ?? "?"}
                        size={30}
                        className="shrink-0 mb-0.5"
                      />
                    )}

                    {/* Message column */}
                    <div
                      className={`flex flex-col max-w-[72%] ${
                        isUser ? "items-end" : "items-start"
                      }`}
                    >
                      {/* Name + timestamp */}
                      <p className="text-[11px] text-gray-400 mb-1 px-1">
                        {senderName} · {msgTime(m.created_at)}
                        {isOptimistic && (
                          <span className="ml-1 opacity-60">· Sending…</span>
                        )}
                      </p>

                      {/* Bubble */}
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-sm transition-opacity ${
                          isUser
                            ? "bg-violet-500 text-white rounded-br-sm"
                            : "bg-gray-100 text-gray-900 rounded-bl-sm"
                        } ${isOptimistic ? "opacity-70" : "opacity-100"}`}
                      >
                        {m.body && (
                          <p className="leading-relaxed whitespace-pre-wrap">{m.body}</p>
                        )}
                        {showAsImage && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.image_url!}
                            alt="attachment"
                            className={`${m.body ? "mt-2" : ""} rounded-xl max-h-56 max-w-full object-cover`}
                          />
                        )}
                        {showAsFile && (
                          <a
                            href={m.image_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 text-sm underline underline-offset-2 ${
                              isUser ? "text-white/90" : "text-violet-600"
                            }`}
                          >
                            <FileText className="h-4 w-4 shrink-0" />
                            <span className="truncate max-w-[180px]">
                              {decodeURIComponent(
                                m.image_url!.split("/").pop()?.split("?")[0]?.replace(/^\d+-/, "") ?? "File"
                              )}
                            </span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Outgoing avatar */}
                    {isUser && (
                      <UserAvatar name="You" size={30} className="shrink-0 mb-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Composer ── */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-100">

        {/* Pending media preview */}
        {pendingMedia && (
          <div className="mb-2 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2">
            {pendingMedia.isImage && pendingMedia.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pendingMedia.previewUrl}
                alt=""
                className="h-12 w-12 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-gray-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">{pendingMedia.file.name}</p>
              <p className="text-[11px] text-gray-400">
                {pendingMedia.uploading
                  ? "Uploading…"
                  : pendingMedia.uploadedUrl
                  ? "Ready to send"
                  : "Upload failed — remove and try again"}
              </p>
            </div>
            <button
              type="button"
              onClick={removePendingMedia}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors text-gray-400 shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Input row */}
        <form onSubmit={handleSend}>
          <div className="flex items-end gap-2">

            {/* Left action buttons */}
            <div className="flex items-center gap-0.5 pb-1.5">

              {/* Emoji picker */}
              <div className="relative" ref={emojiPickerRef}>
                <button
                  type="button"
                  onClick={() => setEmojiPickerOpen((o) => !o)}
                  disabled={!activeConvId}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-40"
                  title="Add emoji"
                >
                  <Smile className="h-5 w-5" />
                </button>

                {emojiPickerOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-2xl p-3 z-50">
                    <div className="grid grid-cols-8 gap-0.5">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleEmojiSelect(emoji)}
                          className="text-xl h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Image */}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={!activeConvId || !!pendingMedia}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-40"
                title="Add image"
              >
                <ImageIcon className="h-5 w-5" />
              </button>

              {/* File attachment */}
              <button
                type="button"
                onClick={() => attachmentInputRef.current?.click()}
                disabled={!activeConvId || !!pendingMedia}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-40"
                title="Add attachment"
              >
                <Paperclip className="h-5 w-5" />
              </button>
            </div>

            {/* Text input */}
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={draftText}
                onChange={(e) => {
                  setDraftText(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                placeholder={activeConv ? "Write a message…" : "Select a conversation"}
                rows={1}
                disabled={!activeConvId}
                className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-shadow disabled:opacity-50 overflow-hidden"
                style={{ minHeight: 42, maxHeight: 120 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
              />
            </div>

            {/* Send button */}
            <div className="pb-1.5 shrink-0">
              <button
                type="submit"
                disabled={!canSend}
                title="Send"
                className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${
                  canSend
                    ? "bg-gray-900 text-white hover:bg-gray-700"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>

        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />
        <input
          ref={attachmentInputRef}
          type="file"
          accept="*/*"
          className="hidden"
          onChange={handleAttachmentSelect}
        />
      </div>
    </div>
  );

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-5">Messages</h1>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-xs text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-3 text-red-400 hover:text-red-600 shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
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
