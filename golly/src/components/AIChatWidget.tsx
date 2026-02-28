"use client";

import { useEffect, useRef, useState } from "react";

/* ── types ──────────────────────────────────────────── */

type Role = "user" | "assistant";

type Message = {
  id: string;
  role: Role;
  text: string;
};

/* ── stub responses (replace with real API call later) ── */

const STUB_RESPONSES: Record<string, string> = {
  default: [
    "I\u2019m Golly AI \uD83E\uDD16 \u2014 I can help you plan activities, find summer camps, or build a schedule for a day off. Try asking something like:",
    "\u2022 \u201CPlan a week of summer camps for my 7-year-old\u201D",
    "\u2022 \u201CWhat\u2019s a good class for a snow day?\u201D",
    "\u2022 \u201CFind something creative near me\u201D",
  ].join("\n\n"),
  summer: [
    "Here\u2019s a sample summer plan for a 7\u201310 year old:",
    "Week 1\u20132: Art & Creativity Camp \u2014 great for building confidence",
    "Week 3\u20134: Science Explorers \u2014 hands-on STEM experiments",
    "Week 5\u20136: Sports Fundamentals \u2014 team-building & fitness",
    "Week 7\u20138: Theater & Performance \u2014 a fun finale!",
    "Want me to search Golly for real camps that match this?",
  ].join("\n"),
  snow: [
    "Perfect snow day picks:",
    "\uD83C\uDFA8 Drawing & Painting Workshop \u2014 drop-in, all ages",
    "\uD83E\uDDEA Kitchen Science Club \u2014 fun experiments at home",
    "\uD83C\uDFAD Improv for Kids \u2014 builds confidence & creativity",
    "\uD83D\uDCDA Book Club Afternoon \u2014 cozy reading + discussion",
    "Should I look up which of these are available this week?",
  ].join("\n"),
  creative: [
    "Some popular creative classes on Golly:",
    "\uD83D\uDD8C\uFE0F Watercolor for Kids",
    "\uD83C\uDFB8 Intro to Guitar (ages 6+)",
    "\uD83E\uDDF5 Beginner Sewing",
    "\uD83C\uDFAC Stop-Motion Animation",
    "Want me to filter by age or location?",
  ].join("\n"),
};

function getStubResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("summer")) return STUB_RESPONSES.summer;
  if (lower.includes("snow") || lower.includes("day off") || lower.includes("holiday"))
    return STUB_RESPONSES.snow;
  if (
    lower.includes("creative") ||
    lower.includes("art") ||
    lower.includes("music") ||
    lower.includes("class")
  )
    return STUB_RESPONSES.creative;
  return STUB_RESPONSES.default;
}

/* ── component ───────────────────────────────────────── */

let msgCounter = 0;
function newId() {
  return `msg-${++msgCounter}`;
}

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  text: "Hi! I'm Golly AI 🤖\n\nAsk me to plan summer camps, find a class for a day off, or discover something fun nearby.",
};

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

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
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");

    const userMsg: Message = { id: newId(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);

    /* stub: simulate a short delay then reply */
    await new Promise((r) => setTimeout(r, 900));
    const reply: Message = {
      id: newId(),
      role: "assistant",
      text: getStubResponse(text),
    };
    setMessages((prev) => [...prev, reply]);
    setThinking(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <>
      {/* ── Floating button ── */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-label={open ? "Close AI chat" : "Open AI chat"}
        className={`
          fixed bottom-6 left-6 z-50
          flex h-14 w-14 items-center justify-center
          rounded-full shadow-lg
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
          ${open
            ? "bg-foreground text-background scale-95"
            : "bg-primary text-primary-foreground hover:scale-105 hover:shadow-xl"
          }
        `}
      >
        {open ? (
          /* X icon */
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          /* Robot icon */
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {/* head */}
            <rect x="3" y="8" width="18" height="12" rx="3" />
            {/* eyes */}
            <circle cx="9" cy="14" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="15" cy="14" r="1.5" fill="currentColor" stroke="none" />
            {/* antenna */}
            <line x1="12" y1="8" x2="12" y2="4" />
            <circle cx="12" cy="3" r="1" fill="currentColor" stroke="none" />
            {/* mouth */}
            <path d="M9 17.5 Q12 19.5 15 17.5" />
          </svg>
        )}
      </button>

      {/* ── Chat drawer ── */}
      {open && (
        <>
          {/* Backdrop (mobile) */}
          <div
            className="fixed inset-0 z-40 bg-black/20 sm:hidden"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div
            className={`
              fixed z-50
              bottom-24 left-6
              w-[calc(100vw-3rem)] max-w-sm
              rounded-3xl bg-card shadow-2xl border border-border
              flex flex-col overflow-hidden
              animate-in slide-in-from-bottom-4 fade-in duration-200
            `}
            style={{ maxHeight: "min(540px, 70vh)" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-card shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="8" width="18" height="12" rx="3" />
                  <circle cx="9" cy="14" r="1.5" fill="currentColor" stroke="none" />
                  <circle cx="15" cy="14" r="1.5" fill="currentColor" stroke="none" />
                  <line x1="12" y1="8" x2="12" y2="4" />
                  <circle cx="12" cy="3" r="1" fill="currentColor" stroke="none" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-none">Golly AI</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Activity planner</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
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
      )}
    </>
  );
}
