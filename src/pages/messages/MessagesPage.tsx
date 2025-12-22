// src/pages/messages/MessagesPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Container } from "../../components/layout/Container";
import { SectionHeader } from "../../components/layout/SectionHeader";

import type { Conversation, Message } from "../../components/messages/messageTypes";
import { ConversationList } from "../../components/messages/ConversationList";
import { ConversationHeader } from "../../components/messages/ConversationHeader";
import { MessageList } from "../../components/messages/MessageList";
import { MessageComposer } from "../../components/messages/MessageComposer";
import { isMockConversationId, safeSender } from "../../components/messages/utils";

//
// MOCK DATA (fallback if Supabase has nothing or errors)
//
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

export const MessagesPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, Message[]>
  >({});
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draftText, setDraftText] = useState("");
  const [sending, setSending] = useState(false);

  // Mobile: show list OR thread
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select(
          "id, participant_name, avatar_emoji, last_message_preview, last_message_at, unread_count, participant_profile_id, camp_slug, camp_name"
        )
        .order("last_message_at", { ascending: false })
        .limit(20);

      const { data: msgData, error: msgError } = await supabase
        .from("messages")
        .select("id, conversation_id, sender, body, created_at, image_url")
        .order("created_at", { ascending: true })
        .limit(400);

      if (convError || msgError || !convData || convData.length === 0) {
        console.warn("[MessagesPage] Using mock data:", convError, msgError);
        setConversations(mockConversations);
        setMessagesByConversation(mockMessages);
        setActiveConversationId(mockConversations[2]?.id ?? null);
        setMobileView("list");
        setLoading(false);
        return;
      }

      setConversations(convData as Conversation[]);

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

      const firstId = convData[0]?.id ? String(convData[0].id) : null;
      setActiveConversationId(firstId);
      setMobileView("list");
      setLoading(false);
    };

    load().catch((err) => {
      console.warn("[MessagesPage] Unexpected error, falling back to mock:", err);
      setConversations(mockConversations);
      setMessagesByConversation(mockMessages);
      setActiveConversationId(mockConversations[2]?.id ?? null);
      setMobileView("list");
      setError("We couldn’t load messages right now.");
      setLoading(false);
    });
  }, []);

  const activeConversation = useMemo(
    () =>
      activeConversationId
        ? conversations.find((c) => c.id === activeConversationId) ?? null
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
  };

  const handleBackToList = () => setMobileView("list");

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

    // Optimistic UI preview
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

    setDraftText("");
    setSending(true);
    setError(null);

    // Mock mode: don't attempt DB insert (conversation_id isn't a uuid)
    if (isMockConversationId(activeConversationId)) {
      setSending(false);
      return;
    }

    try {
      let imageUrl: string | null = null;
      if (attachment) {
        imageUrl = await uploadAttachment(activeConversationId, attachment);
      }

      const { error: insertError } = await supabase.from("messages").insert({
        conversation_id: activeConversationId,
        sender: "user",
        body: body || "",
        image_url: imageUrl,
      });

      if (insertError) throw insertError;
    } catch (err: any) {
      console.warn("[MessagesPage] Failed to send message:", err);
      setError(err?.message ?? "Message failed to send.");
    } finally {
      setSending(false);
      if (localImageUrl) URL.revokeObjectURL(localImageUrl);
    }
  };

  return (
    <main className="flex-1">
      <Container className="py-6 lg:py-8">
        <SectionHeader
          title="Messages"
          className="mb-4 lg:mb-6"
        />

        <div className="h-[calc(100vh-10rem)] max-h-[760px]">
          {/* Desktop: two panels */}
          <div className="hidden lg:grid grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-6 h-full">
            <ConversationList
              conversations={conversations}
              activeConversationId={activeConversationId}
              loading={loading}
              onSelect={setActiveConversationId}
            />

            <section className="flex flex-col rounded-3xl border border-black/5 bg-[#fff7f3] shadow-sm overflow-hidden">
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
            </section>
          </div>

          {/* Mobile: list OR thread */}
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

                  {activeConversation ? (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {activeConversation.participant_name}
                      </p>
                      <p className="truncate text-[11px] text-gray-500">
                        Camp messages, questions, and updates.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No conversation selected.</p>
                  )}
                </header>

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
