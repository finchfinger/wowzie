"use client";

import { useEffect, useRef, useState } from "react";

/* ── types ─────────────────────────────────────────────── */

type Role = "user" | "assistant";

type Message = {
  id: string;
  role: Role;
  text: string;
};

type ApiMessage = { role: Role; content: string };

/* ── streaming helper ───────────────────────────────────── */

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

/* ── id helper ─────────────────────────────────────────── */

let msgCounter = 0;
function newId() {
  return `msg-${++msgCounter}`;
}

/* ── constants ─────────────────────────────────────────── */

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  text: "Hi! I'm Wowzi AI 🤖\n\nAsk me to plan summer camps, find a class for a day off, or discover something fun nearby.",
};

const SUGGESTION_CHIPS = [
  "Plan my summer",
  "Snow day ideas",
  "Creative classes",
  "STEM camps near me",
];

/* ── robot icon ─────────────────────────────────────────── */

function RobotIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    >
      <rect x="3" y="8" width="18" height="12" rx="3" />
      <circle cx="9" cy="14" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="1.5" fill="currentColor" stroke="none" />
      <line x1="12" y1="8" x2="12" y2="4" />
      <circle cx="12" cy="3" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ── page ──────────────────────────────────────────────── */

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 120);
  }, []);

  const send = async (text?: string) => {
    const body = (text ?? input).trim();
    if (!body || thinking) return;
    setInput("");

    const userMsg: Message = { id: newId(), role: "user", text: body };

    const history: ApiMessage[] = [
      ...messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.text })),
      { role: "user" as const, content: body },
    ];

    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);

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

  const handleNewChat = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setThinking(false);
    setInput("");
    setMessages([WELCOME]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const isFirstMessage = messages.length <= 1;

  return (
    <main>
      <div className="page-container">
        <div className="page-grid">
          <div className="span-8-center flex flex-col" style={{ height: "calc(100dvh - 72px)" }}>

      {/* Page header */}
      <div className="py-5 flex items-center gap-3 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <RobotIcon size={18} />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground leading-none">
            Wowzi AI
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Activity planner</p>
        </div>
        {!isFirstMessage && (
          <button
            type="button"
            onClick={handleNewChat}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New chat
          </button>
        )}
      </div>

      {/* Chat card */}
      <div className="rounded-2xl bg-card border border-border/50 overflow-hidden flex flex-col flex-1 min-h-0 mb-4">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 min-h-0">

          {/* Welcome hero — only on fresh chat */}
          {isFirstMessage && (
            <div className="flex flex-col items-center text-center py-8 gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <RobotIcon size={28} />
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                Ask me to plan summer camps, find classes for a snow day, or discover something fun nearby.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && msg.id !== "welcome" && (
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mr-2.5 mt-0.5 text-primary">
                  <RobotIcon size={14} />
                </div>
              )}
              {msg.id === "welcome" ? null : (
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  {msg.text}
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator — only show when streaming placeholder is empty */}
          {thinking && messages[messages.length - 1]?.text === "" && (
            <div className="flex justify-start">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mr-2.5 mt-0.5 text-primary">
                <RobotIcon size={14} />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex gap-1 items-center">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggestion chips */}
        {isFirstMessage && (
          <div className="px-5 pb-3 flex gap-2 flex-wrap shrink-0">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => void send(chip)}
                disabled={thinking}
                className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-5 py-4 border-t border-border/50 shrink-0">
          <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-4 py-2.5 focus-within:ring-1 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all">
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
              className="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity hover:opacity-90 shrink-0"
            >
              <svg
                width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Wowzi AI can make mistakes. Always verify camp details directly with the host.
          </p>
        </div>
      </div>
          </div>
        </div>
      </div>
    </main>
  );
}
