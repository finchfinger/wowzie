"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function MessagesPageWrapper() {
  return (
    <Suspense
      fallback={
        <main>
          <div className="page-container py-8">
            <div className="page-grid">
              <div className="span-10-center text-sm text-muted-foreground">
                Loading messages…
              </div>
            </div>
          </div>
        </main>
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

/* ── mock data ─────────────────────────────────────────── */

const _now  = new Date().toISOString();
const _30m  = new Date(Date.now() - 30 * 60000).toISOString();
const _1h   = new Date(Date.now() - 3600000).toISOString();
const _2h   = new Date(Date.now() - 2 * 3600000).toISOString();
const _1d   = new Date(Date.now() - 86400000).toISOString();
const _3d   = new Date(Date.now() - 3 * 86400000).toISOString();
const _1wk  = new Date(Date.now() - 7 * 86400000).toISOString();

const mockConversations: Conversation[] = [
  {
    id: "mock-wildwood",
    participant_name: "Camp Wildwood",
    avatar_emoji: null,
    last_message_preview: "We can't wait to see you tomorrow. Please use the front entrance for check-in.",
    last_message_at: _now,
    unread_count: 1,
    participant_profile_id: null,
    camp_slug: "camp-wildwood",
    camp_name: "Camp Wildwood",
  },
  {
    id: "mock-golden-gate",
    participant_name: "Golden Gate Arts Camp",
    avatar_emoji: null,
    last_message_preview: "Hi! Do you have any art camps open for 8-year-olds?",
    last_message_at: _30m,
    unread_count: 1,
    participant_profile_id: null,
    camp_slug: "golden-gate-arts",
    camp_name: "Golden Gate Arts Camp",
  },
  {
    id: "mock-riverside",
    participant_name: "Riverside Science Camp",
    avatar_emoji: null,
    last_message_preview: "We have a camper with a peanut allergy…",
    last_message_at: _1d,
    unread_count: 0,
    participant_profile_id: null,
    camp_slug: "riverside-science",
    camp_name: "Riverside Science Camp",
  },
  {
    id: "mock-saddle-grove",
    participant_name: "Saddle and Grove Summer Camp",
    avatar_emoji: null,
    last_message_preview: "Perfect, thanks so much!",
    last_message_at: _1d,
    unread_count: 0,
    participant_profile_id: null,
    camp_slug: "saddle-grove",
    camp_name: "Saddle and Grove Summer Camp",
  },
  {
    id: "mock-stem-robotics",
    participant_name: "STEM Robotics Week",
    avatar_emoji: null,
    last_message_preview: "Thanks for confirming our registration f…",
    last_message_at: _3d,
    unread_count: 0,
    participant_profile_id: null,
    camp_slug: "stem-robotics",
    camp_name: "STEM Robotics Week",
  },
  {
    id: "mock-cooking-adventures",
    participant_name: "Cooking Adventures Camp",
    avatar_emoji: null,
    last_message_preview: "Is there a way to update emergency contact info?",
    last_message_at: _1wk,
    unread_count: 0,
    participant_profile_id: null,
    camp_slug: "cooking-adventures",
    camp_name: "Cooking Adventures Camp",
  },
];

const mockMessagesByConv: Record<string, Message[]> = {
  "mock-wildwood": [
    {
      id: "mock-ww-1",
      conversation_id: "mock-wildwood",
      sender: "them",
      body: "Hey there! What's the drop-off time again for tomorrow's camp? I can't find the confirmation email.",
      created_at: _2h,
      image_url: null,
    },
    {
      id: "mock-ww-2",
      conversation_id: "mock-wildwood",
      sender: "user",
      body: "No problem! Drop-off starts at 8:30 AM, and activities begin at 9:00 AM.",
      created_at: _2h,
      image_url: null,
    },
    {
      id: "mock-ww-3",
      conversation_id: "mock-wildwood",
      sender: "them",
      body: "Would it be okay if we dropped Liam off a bit early? I have a work call at 8:15.",
      created_at: _1h,
      image_url: null,
    },
    {
      id: "mock-ww-4",
      conversation_id: "mock-wildwood",
      sender: "user",
      body: "Totally fine! Our staff will be here starting at 8:00 AM.",
      created_at: _1h,
      image_url: null,
    },
    {
      id: "mock-ww-5",
      conversation_id: "mock-wildwood",
      sender: "them",
      body: "We can't wait to see you tomorrow. Please use the front entrance for check-in. Also, it looks like it might be a hot one. Please pack sunscreen for your little one.",
      created_at: _now,
      image_url: null,
    },
  ],
  "mock-golden-gate": [
    {
      id: "mock-gg-1",
      conversation_id: "mock-golden-gate",
      sender: "them",
      body: "Hi! Do you have any art camps open for 8-year-olds this summer?",
      created_at: _30m,
      image_url: null,
    },
  ],
  "mock-riverside": [
    {
      id: "mock-rs-1",
      conversation_id: "mock-riverside",
      sender: "them",
      body: "Hi, we have a camper with a peanut allergy. Can you confirm the kitchen is nut-free?",
      created_at: _1d,
      image_url: null,
    },
    {
      id: "mock-rs-2",
      conversation_id: "mock-riverside",
      sender: "user",
      body: "Absolutely — our kitchen is completely nut-free and all staff are trained on allergy protocols.",
      created_at: _1d,
      image_url: null,
    },
  ],
  "mock-saddle-grove": [
    {
      id: "mock-sg-1",
      conversation_id: "mock-saddle-grove",
      sender: "them",
      body: "Quick question — can we switch my daughter's session from week 2 to week 3?",
      created_at: _1d,
      image_url: null,
    },
    {
      id: "mock-sg-2",
      conversation_id: "mock-saddle-grove",
      sender: "user",
      body: "Yes, week 3 still has spots! I'll move her over now.",
      created_at: _1d,
      image_url: null,
    },
    {
      id: "mock-sg-3",
      conversation_id: "mock-saddle-grove",
      sender: "them",
      body: "Perfect, thanks so much!",
      created_at: _1d,
      image_url: null,
    },
  ],
  "mock-stem-robotics": [
    {
      id: "mock-sr-1",
      conversation_id: "mock-stem-robotics",
      sender: "them",
      body: "Thanks for confirming our registration for STEM Robotics Week. Really excited!",
      created_at: _3d,
      image_url: null,
    },
  ],
  "mock-cooking-adventures": [
    {
      id: "mock-ca-1",
      conversation_id: "mock-cooking-adventures",
      sender: "them",
      body: "Is there a way to update our emergency contact information before camp starts?",
      created_at: _1wk,
      image_url: null,
    },
    {
      id: "mock-ca-2",
      conversation_id: "mock-cooking-adventures",
      sender: "user",
      body: "Yes! You can update it any time from your account profile page.",
      created_at: _1wk,
      image_url: null,
    },
  ],
};

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
  const [notAuthed, setNotAuthed] = useState(false);
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
  const messagesScrollRef = useRef<HTMLDivElement>(null);
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
    const el = messagesScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
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
          setNotAuthed(true);
          setLoading(false);
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
          // Fall back to mock data so the UI is always demonstrable
          const sorted = sortConvs(mockConversations);
          const target = initialCParam && isMock(initialCParam)
            ? initialCParam
            : sorted[0]?.id ?? null;
          setConversations(sorted);
          setMessagesByConv(mockMessagesByConv);
          setActiveConvId(target);
          setMobileView(initialCParam ? "thread" : "list");
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
    <div className="rounded-card bg-card overflow-hidden h-full flex flex-col">
      {/* Filter + search row */}
      <div className="px-3 py-3 border-b border-border flex items-center gap-2">
        <div className="flex items-center gap-1 bg-muted/60 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground cursor-default shrink-0">
          All
          <svg className="h-3 w-3 ml-0.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div className="flex-1 flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-1.5">
          <svg className="h-3.5 w-3.5 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <Input
            type="text"
            placeholder="Search"
            className="flex-1 h-auto bg-transparent! hover:bg-transparent! focus-visible:bg-transparent! focus-visible:ring-0 px-0 py-0 text-xs"
          />
        </div>
        {!loading && authedUserId && (
          <span
            title={realtimeStatus === "connected" ? "Live" : realtimeStatus === "error" ? "Error" : "Connecting…"}
            className={`h-2 w-2 rounded-full shrink-0 transition-colors ${
              realtimeStatus === "connected" ? "bg-emerald-500" : realtimeStatus === "error" ? "bg-destructive" : "bg-amber-400 animate-pulse"
            }`}
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="px-4 py-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-28 bg-muted rounded" />
                  <div className="h-2.5 w-44 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        )}
        {conversations.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => handleSelectConversation(c.id)}
            className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors border-b border-border last:border-0 ${
              activeConvId === c.id ? "bg-primary/[0.05]" : "hover:bg-muted/50"
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
                      ? "font-semibold text-foreground"
                      : "font-medium text-foreground"
                  }`}
                >
                  {c.participant_name || "Unknown"}
                </p>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {relTime(c.last_message_at)}
                </span>
              </div>
              <p
                className={`text-xs truncate mt-0.5 ${
                  c.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {c.last_message_preview || "No messages yet"}
              </p>
            </div>
            {c.unread_count > 0 && (
              <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-semibold shrink-0">
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
    <div className="rounded-card bg-card overflow-hidden h-full flex flex-col">

      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileView("list")}
          className="lg:hidden shrink-0 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground"
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
              <p className="text-sm font-semibold text-foreground truncate">
                {activeConv.participant_name}
              </p>
              {activeConv.camp_name && (
                <p className="text-[11px] text-muted-foreground truncate">{activeConv.camp_name}</p>
              )}
            </div>
            <button
              type="button"
              className="shrink-0 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Select a conversation to start messaging</p>
        )}
      </div>

      {/* ── Messages ── */}
      <div ref={messagesScrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {activeMessages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            {activeConv ? (
              <>
                <span className="text-3xl">👋</span>
                <p className="text-sm font-medium text-foreground">Start the conversation</p>
                <p className="text-xs text-muted-foreground">Say hello to {activeConv.participant_name ?? "them"}!</p>
              </>
            ) : (
              <>
                <span className="text-3xl">💬</span>
                <p className="text-sm text-muted-foreground">Select a conversation to start messaging</p>
              </>
            )}
          </div>
        )}

        {messageGroups.map((group) => (
          <div key={`${group.dateLabel}-${group.date.toISOString()}`}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] text-muted-foreground font-medium px-2 shrink-0">
                {group.dateLabel}
              </span>
              <div className="flex-1 h-px bg-border" />
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
                      <p className="text-[11px] text-muted-foreground mb-1 px-1">
                        {senderName} · {msgTime(m.created_at)}
                        {isOptimistic && (
                          <span className="ml-1 opacity-60">· Sending…</span>
                        )}
                      </p>

                      {/* Bubble */}
                      <div
                        className={`rounded-card px-3.5 py-2.5 text-sm transition-opacity ${
                          isUser
                            ? "bg-violet-100 text-violet-900 rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
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
                              isUser ? "text-violet-700" : "text-primary"
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
      <div className="px-4 pb-4 pt-2 border-t border-border">

        {/* Pending media preview */}
        {pendingMedia && (
          <div className="mb-2 flex items-center gap-2 bg-muted/50 rounded-xl p-2">
            {pendingMedia.isImage && pendingMedia.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pendingMedia.previewUrl}
                alt=""
                className="h-12 w-12 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{pendingMedia.file.name}</p>
              <p className="text-[11px] text-muted-foreground">
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
              className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground shrink-0"
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
                  className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40"
                  title="Add emoji"
                >
                  <Smile className="h-5 w-5" />
                </button>

                {emojiPickerOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-72 bg-card rounded-card shadow-2xl p-3 z-50">
                    <div className="grid grid-cols-8 gap-0.5">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleEmojiSelect(emoji)}
                          className="text-xl h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
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
                className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40"
                title="Add image"
              >
                <ImageIcon className="h-5 w-5" />
              </button>

              {/* File attachment */}
              <button
                type="button"
                onClick={() => attachmentInputRef.current?.click()}
                disabled={!activeConvId || !!pendingMedia}
                className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40"
                title="Add attachment"
              >
                <Paperclip className="h-5 w-5" />
              </button>
            </div>

            {/* Text input */}
            <div className="flex-1">
              <Textarea
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
                className="resize-none overflow-hidden px-4 py-2.5"
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
                    ? "bg-gray-900 text-white hover:bg-gray-800"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
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
    <main>
      <div className="page-container py-6 lg:py-8">
        <div className="page-grid">
          <div className="span-10-center">
            <PageHeader title="Messages" />

            {error && (
              <div className="mb-4 rounded-xl bg-destructive/10 px-4 py-2.5 text-xs text-destructive flex items-center justify-between">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="ml-3 text-destructive/60 hover:text-destructive shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {notAuthed ? (
              <EmptyState
                icon="chat"
                iconBg="bg-blue-100"
                iconColor="text-blue-500"
                title="Sign in to see your messages"
                description="Your conversations with camps and other parents will appear here."
                action={{ label: "Sign in", href: "#signin" }}
              />
            ) : !loading && conversations.length === 0 ? (
              <EmptyState
                icon="mood"
                iconBg="bg-rose-100"
                iconColor="text-rose-500"
                title="No messages yet"
                description="When camps or other parents reach out, your conversations will appear here."
                action={{ label: "Browse camps and classes", href: "/search" }}
              />
            ) : (
              <div className="h-[calc(100vh-12rem)] max-h-[740px]">
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
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
