"use client";

import { useEffect, useRef, useState } from "react";

/* ── types ──────────────────────────────────────────── */

type Role = "user" | "assistant";

type Message = {
  id: string;
  role: Role;
  text: string;
};

/* ── API call with streaming ── */

type ApiMessage = { role: "user" | "assistant"; content: string };

async function streamReply(
  messages: ApiMessage[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!res.ok) throw new Error(`API error ${res.status}`);
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

/* ── component ───────────────────────────────────────── */

let msgCounter = 0;
function newId() {
  return `msg-${++msgCounter}`;
}

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  text: "Hi! I'm Wowzi AI 🤖\n\nAsk me to plan summer camps, find a class for a day off, or discover something fun nearby.",
};

export function AIChatWidget({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* scroll to bottom on new message */
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, thinking]);

  /* focus input when opened */
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  /* close on Escape */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const send = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");

    const userMsg: Message = { id: newId(), role: "user", text };

    // Build API history (exclude welcome message, map to API shape)
    const history: ApiMessage[] = [
      ...messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.text })),
      { role: "user" as const, content: text },
    ];

    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);

    // Create placeholder for streaming reply
    const replyId = newId();
    setMessages((prev) => [...prev, { id: replyId, role: "assistant", text: "" }]);

    abortRef.current = new AbortController();

    try {
      await streamReply(
        history,
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) => m.id === replyId ? { ...m, text: m.text + chunk } : m)
          );
        },
        abortRef.current.signal,
      );
    } catch (err: unknown) {
      if ((err as Error)?.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === replyId
              ? { ...m, text: "Sorry, something went wrong. Please try again." }
              : m
          )
        );
      }
    } finally {
      setThinking(false);
      abortRef.current = null;
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30 sm:bg-black/20"
        onClick={onClose}
      />

      {/* Drawer — full screen on mobile, right-side panel on sm+ */}
      <div
        className={`
          fixed inset-0
          sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[420px]
          z-50 bg-card flex flex-col
          shadow-2xl sm:border-l sm:border-border
          animate-in slide-in-from-right-4 fade-in duration-200
        `}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-card shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <span className="material-symbols-rounded" style={{ fontSize: "18px" }}>smart_toy</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-none">Wowzi AI</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Activity planner</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`
                  max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
                  ${msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                  }
                `}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {thinking && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggestion chips */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2 flex gap-2 flex-wrap shrink-0">
            {[
              "Plan my summer 🌞",
              "Snow day ideas ❄️",
              "Creative classes 🎨",
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setInput(chip);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-foreground hover:bg-muted transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-border bg-card shrink-0">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-primary/30">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask me anything…"
              disabled={thinking}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={!input.trim() || thinking}
              aria-label="Send"
              className="h-7 w-7 flex items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity hover:opacity-90 shrink-0"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
