"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/* ── Scout blob avatar ──────────────────────────────────── */
// SVG path morphing between 4 organic "puffy" shapes — same point count = smooth morph

// Each path: M + 6 cubic bezier segments + Z, 200×200 viewBox centered at 100,100
const BLOBS = [
  // Shape A — balanced puff
  "M100,18 C128,18 158,35 168,62 C178,89 170,122 152,142 C134,162 108,172 80,165 C52,158 28,138 20,110 C12,82 24,50 44,34 C64,18 72,18 100,18Z",
  // Shape B — lean upper-right
  "M108,16 C136,12 164,32 172,60 C180,88 168,124 146,144 C124,164 94,170 68,160 C42,150 22,126 18,98 C14,70 28,42 50,28 C72,14 80,20 108,16Z",
  // Shape C — lean lower-left
  "M96,20 C124,16 158,36 166,64 C174,92 162,128 138,148 C114,168 82,172 56,158 C30,144 14,116 16,88 C18,60 36,36 58,24 C80,12 68,24 96,20Z",
  // Shape D — wider / squatter
  "M100,22 C130,18 162,38 170,66 C178,94 164,126 140,146 C116,166 82,170 56,156 C30,142 16,112 18,84 C20,56 40,34 64,24 C88,14 70,26 100,22Z",
];

const MORPH_VALUES = [...BLOBS, BLOBS[0]].join(";");

function ScoutBlob({ thinking = false, size = 28 }: { thinking?: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={{ flexShrink: 0, overflow: "visible" }}
    >
      <defs>
        <linearGradient id="scout-blob-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <path d={BLOBS[0]} fill="url(#scout-blob-grad)">
        {thinking && (
          <animate
            attributeName="d"
            values={MORPH_VALUES}
            keyTimes="0;0.25;0.5;0.75;1"
            keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1"
            calcMode="spline"
            dur="3s"
            repeatCount="indefinite"
          />
        )}
      </path>
    </svg>
  );
}

/* ── Link-aware message renderer ───────────────────────── */
function MessageText({ text, onNavigate }: { text: string; onNavigate: (href: string) => void }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (match) {
          const [, label, href] = match;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onNavigate(href)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium transition-colors"
              style={{ background: "#ede9fe", color: "#4f46e5", margin: "1px 2px" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#ddd6fe")}
              onMouseLeave={e => (e.currentTarget.style.background = "#ede9fe")}
            >
              <span className="material-symbols-rounded select-none" style={{ fontSize: 11 }}>open_in_new</span>
              {label}
            </button>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

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

/* ── suggestion chips ──────────────────────────────────── */

const SUGGESTION_CHIPS: Array<{ icon: string; label: string }> = [
  { icon: "sports_soccer",  label: "Soccer camps near me" },
  { icon: "wb_sunny",       label: "Summer camps in Chicago" },
  { icon: "draw",           label: "Art classes for 7 year olds" },
  { icon: "code",           label: "Beginner coding classes" },
];



/* ── MI helper ──────────────────────────────────────────── */

function MI({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <span
      className="material-symbols-rounded select-none"
      style={{ fontSize: size, lineHeight: 1 }}
    >
      {name}
    </span>
  );
}

/* ── page ──────────────────────────────────────────────── */

export default function AIChatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const firstName =
    (user?.user_metadata?.first_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isEmptyState = messages.length === 0;

  useEffect(() => {
    if (!isEmptyState) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, thinking, isEmptyState]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 120);
  }, []);

  const send = async (text?: string) => {
    const body = (text ?? input).trim();
    if (!body || thinking) return;
    setInput("");

    const userMsg: Message = { id: newId(), role: "user", text: body };

    const history: ApiMessage[] = [
      ...messages.map((m) => ({ role: m.role, content: m.text })),
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
    setMessages([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <main
      className="min-h-[calc(100dvh-72px)]"
      style={{ background: "#F3F0FB" }}
    >
      <div className="page-container">
        <div className="page-grid">


          {isEmptyState ? (
            /* ── Empty state — centered on grid ─────── */
            <div className="span-8-center flex flex-col items-center justify-center min-h-[calc(100dvh-72px)] pb-16">

              {/* Greeting */}
              <div className="flex items-center gap-2 mb-3">
                <ScoutBlob size={22} />
                <span className="text-base font-semibold text-foreground">
                  {firstName ? `Hi ${firstName}` : "Hi there"}
                </span>
              </div>

              {/* Heading */}
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight text-center mb-10">
                Let&apos;s find the right camp or class.
              </h1>

              {/* Search input */}
              <div className="w-full mb-5">
                <div className="flex items-center gap-3 rounded-full bg-white px-5 h-14 border border-border/40 focus-within:border-primary/30 transition-colors">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="What are you looking for?"
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  <button
                    type="button"
                    aria-label="Voice input"
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    <MI name="mic" size={20} />
                  </button>
                </div>
              </div>

              {/* Suggestion chips */}
              <div className="flex flex-wrap justify-center gap-2 w-full">
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => void send(chip.label)}
                    className="flex items-center gap-2 rounded-xl border border-border/60 bg-white px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
                  >
                    <span
                      className="material-symbols-rounded text-muted-foreground select-none"
                      style={{ fontSize: 16, lineHeight: 1 }}
                    >
                      {chip.icon}
                    </span>
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

          ) : (
            /* ── Chat state — messages scroll, input fixed at bottom ── */
            <div className="span-8-center">
              {/* Scrollable messages — bottom padding leaves room for fixed input */}
              <div className="pt-6 pb-40 space-y-5">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="mt-0.5">
                        <ScoutBlob size={26} />
                      </div>
                    )}
                    <div
                      className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-violet-100 text-foreground rounded-br-sm"
                          : "bg-muted/60 text-foreground rounded-bl-sm"
                      }`}
                    >
                      <MessageText text={msg.text} onNavigate={(href) => router.push(href)} />
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {thinking && messages[messages.length - 1]?.text === "" && (
                  <div className="flex items-start gap-3 justify-start">
                    <div className="mt-0.5">
                      <ScoutBlob size={26} thinking={true} />
                    </div>
                    <div className="bg-muted/60 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Fixed input bar — always visible at bottom of viewport */}
      {!isEmptyState && (
        <div
          className="fixed bottom-0 left-0 right-0 pb-6 pt-3"
          style={{ background: "linear-gradient(to top, #F3F0FB 70%, transparent)" }}
        >
          <div className="page-container">
            <div className="page-grid">
              <div className="span-8-center">
                <div className="flex items-center gap-3 rounded-full border border-border/40 bg-white px-5 h-14 focus-within:border-primary/30 transition-colors">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="What are you looking for?"
                    disabled={thinking}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50"
                  />
                  <button
                    type="button"
                    aria-label="Voice input"
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    <MI name="mic" size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
