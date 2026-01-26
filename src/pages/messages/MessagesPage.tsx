// src/pages/messages/MessagesPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Container } from "../../components/layout/Container";
import { SectionHeader } from "../../components/layout/SectionHeader";

import type { Conversation, Message } from "../../components/messages/messageTypes";
import { ConversationList } from "../../components/messages/ConversationList";
import { ConversationHeader } from "../../components/messages/ConversationHeader";
import { MessageList } from "../../components/messages/MessageList";
import { MessageComposer } from "../../components/messages/MessageComposer";
import { isMockConversationId, safeSender } from "../../components/messages/utils";

function useQueryParam(locationSearch: string, name: string) {
  const sp = new URLSearchParams(locationSearch);
  const v = sp.get(name);
  return v ? v.trim() : null;
}

function normalizeErr(err: any) {
  if (!err) return "Unknown error.";
  if (typeof err === "string") return err;
  if (err?.message) return String(err.message);
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error.";
  }
}

function isUuidish(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

function sortConversations(convs: Conversation[]) {
  const ts = (iso?: string | null) => {
    const t = iso ? new Date(iso).getTime() : 0;
    return Number.isFinite(t) ? t : 0;
  };
  return [...convs].sort((a, b) => ts(b.last_message_at) - ts(a.last_message_at));
}

function toPreview(body: string) {
  return String(body ?? "").trim().slice(0, 140);
}

function sameish(a?: string | null, b?: string | null) {
  return String(a ?? "").trim() === String(b ?? "").trim();
}

function withinMs(aIso: string, bIso: string, ms: number) {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= ms;
}

const now = new Date();

const mockConversations: Conversation[] = [
  {
    id: "mock-1",
    participant_name: "Sarah Vaughn",
    avatar_emoji: "🍓",
    last_message_preview: "We can do early drop-off from 8:00 AM.",
    last_message_at: now.toISOString(),
    unread_count: 1,
    participant_profile_id: "mock-profile-1",
    camp_slug: "camp-wildwood",
    camp_name: "Camp Wildwood",
  },
  {
    id: "mock-2",
    participant_name: "Camp Wildwood",
    avatar_emoji: "🏕️",
    last_message_preview: "Thanks for confirming! See you tomorrow.",
    last_message_at: now.toISOString(),
    unread_count: 0,
    participant_profile_id: "mock-profile-2",
    camp_slug: "camp-wildwood",
    camp_name: "Camp Wildwood",
  },
  {
    id: "mock-3",
    participant_name: "Charlie Andrews",
    avatar_emoji: "👀",
    last_message_preview: "Perfect, thanks so much!",
    last_message_at: now.toISOString(),
    unread_count: 0,
    participant_profile_id: "mock-profile-3",
    camp_slug: "camp-wildwood",
    camp_name: "Camp Wildwood",
  },
];

const mockMessages: Record<string, Message[]> = {
  "mock-3": [
    {
      id: "m1",
      conversation_id: "mock-3",
      sender: "them",
      body:
        "Hey there! What’s the drop-off time again for tomorrow’s camp? " +
        "I can’t find the confirmation email.",
      created_at: now.toISOString(),
      image_url: null,
    },
    {
      id: "m2",
      conversation_id: "mock-3",
      sender: "user",
      body: "No problem! Drop-off starts at 8:30 AM, and activities begin at 9:00 AM.",
      created_at: now.toISOString(),
      image_url: null,
    },
    {
      id: "m3",
      conversation_id: "mock-3",
      sender: "them",
      body: "Would it be okay if we dropped Liam off a bit early? I have a work call at 8:15.",
      created_at: now.toISOString(),
      image_url: null,
    },
    {
      id: "m4",
      conversation_id: "mock-3",
      sender: "user",
      body: "Totally fine! Our staff will be here starting at 8:00 AM.",
      created_at: now.toISOString(),
      image_url: null,
    },
    {
      id: "m5",
      conversation_id: "mock-3",
      sender: "them",
      body: "Perfect, thanks so much!",
      created_at: now.toISOString(),
      image_url: null,
    },
  ],
};

type BlastStatus = "all" | "pending" | "confirmed" | "declined" | "waitlisted";

function asBlastStatus(v?: string | null): BlastStatus {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "pending") return "pending";
  if (s === "confirmed") return "confirmed";
  if (s === "declined") return "declined";
  if (s === "waitlisted") return "waitlisted";
  return "all";
}

export const MessagesPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const toProfileId = useMemo(() => useQueryParam(location.search, "to"), [location.search]);
  const cParam = useMemo(() => useQueryParam(location.search, "c"), [location.search]);

  // NEW: blast mode params
  const blastActivityId = useMemo(() => useQueryParam(location.search, "blast"), [location.search]);
  const blastStatus = useMemo(
    () => asBlastStatus(useQueryParam(location.search, "status")),
    [location.search]
  );
  const blastMode = useMemo(
    () => !!blastActivityId && isUuidish(blastActivityId),
    [blastActivityId]
  );

  const [authedUserId, setAuthedUserId] = useState<string | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, Message[]>>(
    {}
  );
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draftText, setDraftText] = useState("");
  const [sending, setSending] = useState(false);

  // NEW: blast result state (so the UI can confirm delivery)
  const [blastSending, setBlastSending] = useState(false);
  const [blastResult, setBlastResult] = useState<{
    recipients: number;
    sent: number;
    failed: number;
  } | null>(null);

  const [mobileView, setMobileView] = useState<"list" | "thread">("list");

  const subscriptionsReadyRef = useRef(false);

  const activeConversation = useMemo(
    () =>
      activeConversationId
        ? conversations.find((c) => String(c.id) === String(activeConversationId)) ?? null
        : null,
    [activeConversationId, conversations]
  );

  const activeMessages = useMemo(
    () => (activeConversationId ? messagesByConversation[activeConversationId] ?? [] : []),
    [messagesByConversation, activeConversationId]
  );

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setMobileView("thread");

    if (!isMockConversationId(id)) {
      navigate(`/messages?c=${encodeURIComponent(id)}`, { replace: true });
    }
  };

  const handleBackToList = () => setMobileView("list");

  const ensureConversationForToParam = async (profileId: string) => {
    if (!profileId || !isUuidish(profileId)) {
      throw new Error("Missing or invalid recipient id.");
    }

    const existing = conversations.find(
      (c) => String(c.participant_profile_id) === String(profileId)
    );
    if (existing?.id) return String(existing.id);

    const { data, error: fnErr } = await supabase.functions.invoke("get-or-create-conversation", {
      body: { to_profile_id: profileId },
    });

    if (fnErr) throw new Error(fnErr.message || "Could not start conversation.");

    const ok = (data as any)?.ok;
    if (!ok) throw new Error((data as any)?.error || "Could not start conversation.");

    const conv = (data as any)?.conversation as Conversation | undefined;
    if (!conv?.id) throw new Error("Conversation was not returned.");

    setConversations((prev) =>
      sortConversations([conv, ...prev.filter((c) => String(c.id) !== String(conv.id))])
    );

    setMessagesByConversation((prev) => {
      const id = String(conv.id);
      if (prev[id]) return prev;
      return { ...prev, [id]: [] };
    });

    return String(conv.id);
  };

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userRes.user) {
          setAuthedUserId(null);
          setConversations(mockConversations);
          setMessagesByConversation(mockMessages);
          setActiveConversationId(mockConversations[2]?.id ?? null);
          setMobileView("list");
          setLoading(false);
          return;
        }

        const myId = String(userRes.user.id);
        setAuthedUserId(myId);

        const { data: convData, error: convError } = await supabase
          .from("conversations")
          .select(
            "id, participant_name, avatar_emoji, last_message_preview, last_message_at, unread_count, participant_profile_id, camp_slug, camp_name"
          )
          .eq("user_id", myId)
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .order("updated_at", { ascending: false })
          .limit(50);

        if (convError) throw convError;

        const convs = (convData ?? []) as Conversation[];

        if (!convs || convs.length === 0) {
          setConversations([]);
          setMessagesByConversation({});
          setActiveConversationId(null);
          setMobileView("list");
          setLoading(false);
          return;
        }

        setConversations(sortConversations(convs));

        const convIds = convs.map((c) => String(c.id)).filter(Boolean);

        const { data: msgData, error: msgError } = await supabase
          .from("messages")
          .select("id, conversation_id, sender, body, created_at, image_url")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: true })
          .limit(1200);

        if (msgError) throw msgError;

        const map: Record<string, Message[]> = {};
        (msgData ?? []).forEach((m: any) => {
          const cid = String(m.conversation_id);
          if (!map[cid]) map[cid] = [];
          map[cid].push({
            id: String(m.id),
            conversation_id: cid,
            sender: safeSender(m.sender),
            body: String(m.body ?? ""),
            created_at: String(m.created_at),
            image_url: m.image_url ? String(m.image_url) : null,
          });
        });

        setMessagesByConversation(map);

        let targetConversationId: string | null = null;

        // NEW: if blast mode, stay in list on desktop, thread on mobile, but don't force a conversation id
        if (blastMode) {
          targetConversationId = convs[0]?.id ? String(convs[0].id) : null;
          setActiveConversationId(targetConversationId);
          setMobileView("thread"); // show composer immediately on mobile
          setLoading(false);
          return;
        }

        if (cParam && isUuidish(cParam)) {
          targetConversationId = cParam;
        } else if (toProfileId) {
          try {
            targetConversationId = await ensureConversationForToParam(toProfileId);
            navigate(`/messages?c=${encodeURIComponent(targetConversationId)}`, { replace: true });
          } catch (e: any) {
            setError(normalizeErr(e));
            targetConversationId = convs[0]?.id ? String(convs[0].id) : null;
          }
        } else {
          targetConversationId = convs[0]?.id ? String(convs[0].id) : null;
        }

        setActiveConversationId(targetConversationId);
        setMobileView(toProfileId || cParam ? "thread" : "list");
        setLoading(false);
      } catch (e: any) {
        console.warn("[MessagesPage] load error:", e);
        setError(normalizeErr(e));
        setAuthedUserId(null);
        setConversations(mockConversations);
        setMessagesByConversation(mockMessages);
        setActiveConversationId(mockConversations[2]?.id ?? null);
        setMobileView("list");
        setLoading(false);
      }
    };

    subscriptionsReadyRef.current = false;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toProfileId, cParam, blastMode]);

  // Realtime subscriptions: messages inserts, conversations updates
  useEffect(() => {
    if (!authedUserId) return;
    if (loading) return;

    const realConvs = conversations.filter((c) => c?.id && !isMockConversationId(String(c.id)));
    if (realConvs.length === 0) return;

    const convIds = realConvs.map((c) => String(c.id)).filter(Boolean);
    if (convIds.length === 0) return;

    const convFilter = `conversation_id=in.(${convIds.join(",")})`;
    const convoOwnerFilter = `user_id=eq.${authedUserId}`;

    const channel = supabase.channel(`messages:${authedUserId}`);

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: convFilter },
      (payload: any) => {
        const row = payload?.new;
        if (!row?.id || !row?.conversation_id) return;

        const incoming: Message = {
          id: String(row.id),
          conversation_id: String(row.conversation_id),
          sender: safeSender(row.sender),
          body: String(row.body ?? ""),
          created_at: String(row.created_at ?? new Date().toISOString()),
          image_url: row.image_url ? String(row.image_url) : null,
        };

        const cid = incoming.conversation_id;

        setMessagesByConversation((prev) => {
          const existing = prev[cid] ?? [];

          if (existing.some((m) => String(m.id) === String(incoming.id))) return prev;

          const idxLocal = existing.findIndex((m) => {
            if (!String(m.id).startsWith("local-")) return false;
            if (m.sender !== incoming.sender) return false;
            if (!sameish(m.body, incoming.body)) return false;
            return withinMs(m.created_at, incoming.created_at, 60_000);
          });

          let next = existing;

          if (idxLocal >= 0) {
            next = [...existing];
            next[idxLocal] = incoming;
          } else {
            next = [...existing, incoming];
          }

          next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

          return { ...prev, [cid]: next };
        });

        setConversations((prev) => {
          const preview = toPreview(incoming.body);
          const at = incoming.created_at;

          const updated = prev.map((c) => {
            if (String(c.id) !== String(cid)) return c;

            const isInbound = incoming.sender === "them";
            const isActive = String(activeConversationId ?? "") === String(cid);
            const currentUnread = Number(c.unread_count ?? 0);
            const nextUnread = isInbound && !isActive ? currentUnread + 1 : currentUnread;

            return {
              ...c,
              last_message_preview: preview,
              last_message_at: at,
              unread_count: nextUnread,
            };
          });

          return sortConversations(updated);
        });
      }
    );

    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "conversations", filter: convoOwnerFilter },
      (payload: any) => {
        const row = payload?.new;
        if (!row?.id) return;

        const id = String(row.id);

        setConversations((prev) => {
          const next = prev.map((c) => {
            if (String(c.id) !== id) return c;
            return {
              ...c,
              last_message_preview: row.last_message_preview ?? c.last_message_preview ?? null,
              last_message_at: row.last_message_at ?? c.last_message_at ?? null,
              unread_count:
                row.unread_count === null || row.unread_count === undefined
                  ? c.unread_count ?? 0
                  : Number(row.unread_count),
              participant_name: row.participant_name ?? c.participant_name,
              avatar_emoji: row.avatar_emoji ?? c.avatar_emoji ?? null,
              participant_profile_id: row.participant_profile_id ?? c.participant_profile_id ?? null,
              camp_slug: row.camp_slug ?? c.camp_slug ?? null,
              camp_name: row.camp_name ?? c.camp_name ?? null,
            };
          });
          return sortConversations(next);
        });
      }
    );

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        subscriptionsReadyRef.current = true;
      }
    });

    return () => {
      subscriptionsReadyRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [authedUserId, loading, conversations, activeConversationId]);

  // Mark active conversation as read locally, and best-effort persist
  useEffect(() => {
    if (!authedUserId) return;
    if (!activeConversationId) return;
    if (isMockConversationId(String(activeConversationId))) return;
    // NEW: do not auto-mark anything in blast mode (no "active thread" concept)
    if (blastMode) return;

    setConversations((prev) =>
      prev.map((c) => {
        if (String(c.id) !== String(activeConversationId)) return c;
        return { ...c, unread_count: 0 };
      })
    );

    void supabase.from("conversations").update({ unread_count: 0 }).eq("id", activeConversationId);
  }, [authedUserId, activeConversationId, blastMode]);

  const uploadAttachment = async (conversationId: string, file: File) => {
    const ext = file.name.split(".").pop() || "jpg";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
    const path = `messages/${conversationId}/${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}-${safeName}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("message-attachments")
      .upload(path, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("message-attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSend = async (e: React.FormEvent, attachment?: File | null) => {
    e.preventDefault();
    if (!activeConversationId) return;

    const body = draftText.trim();
    const localImageUrl = attachment ? URL.createObjectURL(attachment) : null;

    const optimisticMessage: Message = {
      id: `local-${Date.now()}`,
      conversation_id: activeConversationId,
      sender: "user",
      body,
      created_at: new Date().toISOString(),
      image_url: localImageUrl,
    };

    setMessagesByConversation((prev) => {
      const existing = prev[activeConversationId] ?? [];
      return { ...prev, [activeConversationId]: [...existing, optimisticMessage] };
    });

    setConversations((prev) =>
      sortConversations(
        prev.map((c) => {
          if (String(c.id) !== String(activeConversationId)) return c;
          return {
            ...c,
            last_message_preview: toPreview(body),
            last_message_at: optimisticMessage.created_at,
          };
        })
      )
    );

    setDraftText("");
    setSending(true);
    setError(null);

    if (isMockConversationId(activeConversationId)) {
      setSending(false);
      return;
    }

    try {
      let imageUrl: string | null = null;
      if (attachment) {
        imageUrl = await uploadAttachment(activeConversationId, attachment);
      }

      const conv = activeConversation;
      const toId = conv?.participant_profile_id ? String(conv.participant_profile_id) : null;

      if (!toId || !isUuidish(toId)) {
        throw new Error("Could not determine recipient for this conversation.");
      }

      const { data, error: fnErr } = await supabase.functions.invoke("send-message", {
        body: { to_profile_id: toId, body: body || "", image_url: imageUrl },
      });

      if (fnErr) throw new Error(fnErr.message || "Failed to send message.");
      if (!(data as any)?.ok) throw new Error((data as any)?.error || "Failed to send message.");

      const preview = String((data as any)?.last_message_preview ?? body ?? "").slice(0, 140);
      const at = String((data as any)?.last_message_at ?? new Date().toISOString());

      setConversations((prev) =>
        sortConversations(
          prev.map((c) => {
            if (String(c.id) !== String(activeConversationId)) return c;
            return {
              ...c,
              last_message_preview: preview,
              last_message_at: at,
            } as Conversation;
          })
        )
      );
    } catch (err: any) {
      console.warn("[MessagesPage] Failed to send message:", err);
      setError(normalizeErr(err));
    } finally {
      setSending(false);
      if (localImageUrl) URL.revokeObjectURL(localImageUrl);
    }
  };

  // NEW: blast send handler
  const handleSendBlast = async (e: React.FormEvent, attachment?: File | null) => {
    e.preventDefault();
    if (!blastActivityId || !isUuidish(blastActivityId)) return;

    const body = draftText.trim();
    const localImageUrl = attachment ? URL.createObjectURL(attachment) : null;

    // very light optimistic UX: clear composer and show sending state.
    setBlastResult(null);
    setError(null);
    setBlastSending(true);
    setDraftText("");

    if (!body && !attachment) {
      setBlastSending(false);
      if (localImageUrl) URL.revokeObjectURL(localImageUrl);
      return;
    }

    try {
      let imageUrl: string | null = null;
      if (attachment) {
        // store attachments under a stable blast folder so we don't require a conversation id
        imageUrl = await uploadAttachment(`blast-${blastActivityId}`, attachment);
      }

      const { data, error: fnErr } = await supabase.functions.invoke("send-blast-message", {
        body: {
          activity_id: blastActivityId,
          status_filter: blastStatus,
          body: body || "",
          image_url: imageUrl,
        },
      });

      if (fnErr) throw new Error(fnErr.message || "Failed to send blast.");
      if (!(data as any)?.ok) throw new Error((data as any)?.error || "Failed to send blast.");

      setBlastResult({
        recipients: Number((data as any)?.recipients ?? 0),
        sent: Number((data as any)?.sent ?? 0),
        failed: Number((data as any)?.failed ?? 0),
      });

      // After sending, kick the user back to the list so they can see updated threads
      if (window.innerWidth < 1024) {
        setMobileView("list");
      }
    } catch (err: any) {
      setError(normalizeErr(err));
    } finally {
      setBlastSending(false);
      if (localImageUrl) URL.revokeObjectURL(localImageUrl);
    }
  };

  const desktopThread = (
    <section className="flex flex-col rounded-3xl border border-black/5 bg-[#fff7f3] shadow-sm overflow-hidden">
      {blastMode ? (
        <>
          <header className="px-5 py-4 border-b border-black/5 bg-[#fff7f3]">
            <p className="text-sm font-semibold text-gray-900">Announcement</p>
            <p className="mt-1 text-xs text-gray-600">
              Write once, we’ll deliver it to all guests{blastStatus !== "all" ? ` (${blastStatus})` : ""}.
            </p>

            {blastResult ? (
              <p className="mt-2 text-xs text-gray-700">
                Sent to {blastResult.sent} households
                {blastResult.failed ? `, ${blastResult.failed} failed` : ""}.
              </p>
            ) : null}
          </header>

          <div className="flex-1 px-5 py-4">
            <div className="rounded-2xl border border-black/5 bg-white p-4">
              <p className="text-xs font-medium text-gray-900">Tip</p>
              <p className="mt-1 text-xs text-gray-600">
                Keep it short and specific. Replies will come back as individual threads.
              </p>
            </div>
          </div>

          <MessageComposer
            active
            placeholder="Write an update to all guests…"
            value={draftText}
            sending={blastSending}
            onChange={setDraftText}
            onSend={handleSendBlast}
          />
        </>
      ) : (
        <>
          <ConversationHeader conversation={activeConversation} />
          <MessageList active={!!activeConversation} messages={activeMessages} />
          <MessageComposer
            active={!!activeConversation}
            placeholder={
              activeConversation
                ? `Message ${activeConversation.participant_name}`
                : "Select a conversation to start messaging"
            }
            value={draftText}
            sending={sending}
            onChange={setDraftText}
            onSend={handleSend}
          />
        </>
      )}
    </section>
  );

  return (
    <main className="flex-1">
      <Container className="py-6 lg:py-8">
        <SectionHeader title="Messages" className="mb-4 lg:mb-6" />

        <div className="h-[calc(100vh-10rem)] max-h-[760px]">
          <div className="hidden lg:grid grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-6 h-full">
            <ConversationList
              conversations={conversations}
              activeConversationId={activeConversationId}
              loading={loading}
              onSelect={setActiveConversationId}
            />

            {desktopThread}
          </div>

          <div className="lg:hidden h-full">
            {mobileView === "list" ? (
              <ConversationList
                conversations={conversations}
                activeConversationId={activeConversationId}
                loading={loading}
                onSelect={handleSelectConversation}
              />
            ) : (
              <section className="flex flex-col rounded-3xl border border-black/5 bg-[#fff7f3] shadow-sm overflow-hidden h-full">
                <header className="px-3 py-3 border-b border-black/5 flex items-center gap-2 bg-[#fff7f3]">
                  <button
                    type="button"
                    onClick={handleBackToList}
                    className="shrink-0 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    Back
                  </button>

                  {blastMode ? (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">Announcement</p>
                      <p className="truncate text-[11px] text-gray-500">
                        Write once, deliver to all guests{blastStatus !== "all" ? ` (${blastStatus})` : ""}.
                      </p>
                    </div>
                  ) : activeConversation ? (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {activeConversation.participant_name}
                      </p>
                      <p className="truncate text-[11px] text-gray-500">
                        Messages, questions, and updates.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No conversation selected.</p>
                  )}
                </header>

                {blastMode ? (
                  <>
                    <div className="flex-1 px-4 py-4">
                      {blastResult ? (
                        <div className="rounded-2xl border border-black/5 bg-white p-4">
                          <p className="text-xs font-medium text-gray-900">Sent</p>
                          <p className="mt-1 text-xs text-gray-700">
                            Delivered to {blastResult.sent} households
                            {blastResult.failed ? `, ${blastResult.failed} failed` : ""}.
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-black/5 bg-white p-4">
                          <p className="text-xs font-medium text-gray-900">Announcement</p>
                          <p className="mt-1 text-xs text-gray-600">
                            Replies will come back as individual threads.
                          </p>
                        </div>
                      )}
                    </div>

                    <MessageComposer
                      active
                      placeholder="Write an update to all guests…"
                      value={draftText}
                      sending={blastSending}
                      onChange={setDraftText}
                      onSend={handleSendBlast}
                    />
                  </>
                ) : (
                  <>
                    <MessageList active={!!activeConversation} messages={activeMessages} />
                    <MessageComposer
                      active={!!activeConversation}
                      placeholder={
                        activeConversation
                          ? `Message ${activeConversation.participant_name}`
                          : "Select a conversation to start messaging"
                      }
                      value={draftText}
                      sending={sending}
                      onChange={setDraftText}
                      onSend={handleSend}
                    />
                  </>
                )}
              </section>
            )}
          </div>
        </div>

        {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
      </Container>
    </main>
  );
};

export default MessagesPage;
