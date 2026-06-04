"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { format, isToday, isYesterday } from "date-fns";

/* ── Types ─────────────────────────────────────────────── */

export type MessageOverlayProps = {
  /** Whether the overlay is visible */
  open: boolean;
  /** Friend's profile ID (used to find/create conversation) */
  recipientId: string;
  /** Friend's display name */
  recipientName: string;
  /** Friend's avatar URL */
  recipientAvatarUrl?: string | null;
  onClose: () => void;
};

type Message = {
  id: string;
  sender: "user" | "them";
  body: string;
  created_at: string;
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return `Yesterday ${format(d, "h:mm a")}`;
  return format(d, "MMM d, h:mm a");
}

/* ── Component ─────────────────────────────────────────── */

export function MessageOverlay({
  open,
  recipientId,
  recipientName,
  recipientAvatarUrl,
  onClose,
}: MessageOverlayProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [convId, setConvId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* Load or create conversation */
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;

    async function load() {
      // Find existing conversation
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("user_id", user!.id)
        .eq("participant_profile_id", recipientId)
        .maybeSingle();

      if (cancelled) return;

      let cid = existing?.id ?? null;

      if (!cid) {
        const { data: created } = await supabase
          .from("conversations")
          .insert({
            user_id: user!.id,
            participant_profile_id: recipientId,
            participant_name: recipientName,
            type: "dm",
            unread_count: 0,
          })
          .select("id")
          .single();
        cid = created?.id ?? null;
      }

      if (!cid || cancelled) return;
      setConvId(cid);

      const { data: msgs } = await supabase
        .from("messages")
        .select("id, sender, body, created_at")
        .eq("conversation_id", cid)
        .order("created_at", { ascending: true })
        .limit(100);

      if (!cancelled) setMessages((msgs ?? []) as Message[]);
    }

    void load();
    return () => { cancelled = true; };
  }, [open, user, recipientId, recipientName]);

  /* Scroll to bottom when messages change */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* Focus input when opened */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  async function handleSend() {
    if (!body.trim() || !convId || !user || sending) return;
    setSending(true);
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      sender: "user",
      body: body.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setBody("");

    const { data: sent } = await supabase
      .from("messages")
      .insert({ conversation_id: convId, sender: "user", body: optimistic.body })
      .select("id, sender, body, created_at")
      .single();

    if (sent) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? (sent as Message) : m))
      );
    }
    setSending(false);
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-4 right-4 bottom-4 z-50 flex flex-col bg-background rounded-2xl shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-[110%]"
        }`}
        style={{ width: 380 }}
        role="dialog"
        aria-label={`Message ${recipientName}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar name={recipientName} avatarUrl={recipientAvatarUrl} size={40} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{recipientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => router.push("/messages")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              Go to Messages
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
              aria-label="Close"
            >
              <span className="material-symbols-outlined select-none" style={{ fontSize: 18 }} aria-hidden>close</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              Start a conversation with {recipientName}.
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                  m.sender === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                <p className="text-sm leading-snug">{m.body}</p>
                <p className={`text-[10px] mt-1 ${m.sender === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {fmtTime(m.created_at)}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="shrink-0 px-4 pb-4 pt-2 border-t border-border">
          <div className="flex items-end gap-2 bg-muted rounded-2xl px-4 py-2">
            <textarea
              ref={inputRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Type a message"
              rows={1}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[24px] max-h-[120px]"
              style={{ lineHeight: "1.5" }}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!body.trim() || sending}
              className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
              aria-label="Send"
            >
              <span className="material-symbols-outlined select-none" style={{ fontSize: 16 }} aria-hidden>arrow_upward</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
