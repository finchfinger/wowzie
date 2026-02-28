"use client";

import { useEffect, useRef, useState } from "react";

/* ── types ─────────────────────────────────────────────── */

type Role = "user" | "assistant";

type Message = {
  id: string;
  role: Role;
  text: string;
};

/* ── stub responses (replace with real API call) ─────── */

const STUB_RESPONSES: Record<string, string> = {
  default: [
    "I'm Golly AI 🤖 — I can help you plan activities, find summer camps, or build a schedule for a day off. Try asking something like:",
    "• \"Plan a week of summer camps for my 7-year-old\"",
    "• \"What's a good class for a snow day?\"",
    "• \"Find something creative near me\"",
  ].join("\n\n"),
  summer: [
    "Here's a sample summer plan for a 7–10 year old:",
    "Week 1–2: Art & Creativity Camp — great for building confidence",
    "Week 3–4: Science Explorers — hands-on STEM experiments",
    "Week 5–6: Sports Fundamentals — team-building & fitness",
    "Week 7–8: Theater & Performance — a fun finale!",
    "Want me to search Golly for real camps that match this?",
  ].join("\n"),
  snow: [
    "Perfect snow day picks:",
    "🎨 Drawing & Painting Workshop — drop-in, all ages",
    "🧪 Kitchen Science Club — fun experiments at home",
    "🎭 Improv for Kids — builds confidence & creativity",
    "📚 Book Club Afternoon — cozy reading + discussion",
    "Should I look up which of these are available this week?",
  ].join("\n"),
  creative: [
    "Some popular creative classes on Golly:",
    "🖌️ Watercolor for Kids",
    "🎸 Intro to Guitar (ages 6+)",
    "🧵 Beginner Sewing",
    "🎬 Stop-Motion Animation",
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

/* ── id helper ─────────────────────────────────────────── */

let msgCounter = 0;
function newId() {
  return `msg-${++msgCounter}`;
}

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  text: "Hi! I'm Golly AI 🤖\n\nAsk me to plan summer camps, find a class for a day off, or discover something fun nearby.",
};

const SUGGESTION_CHIPS = [
  "Plan my summer 🌞",
  "Snow day ideas ❄️",
  "Creative classes 🎨",
  "STEM camps near me 🔬",
];

/* ── page ──────────────────────────────────────────────── */

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  /* Scroll to bottom on new message */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  /* Focus input on mount */
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 120);
  }, []);

  const send = async (text?: string) => {
    const body = (text ?? input).trim();
    if (!body || thinking) return;
    setInput("");

    const userMsg: Message = { id: newId(), role: "user", text: body };
    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);

    await new Promise((r) => setTimeout(r, 900));

    const reply: Message = {
      id: newId(),
      role: "assistant",
      text: getStubResponse(body),
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
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
      {/* Page header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          >
            <rect x="3" y="8" width="18" height="12" rx="3" />
            <circle cx="9" cy="14" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="15" cy="14" r="1.5" fill="currentColor" stroke="none" />
            <line x1="12" y1="8" x2="12" y2="4" />
            <circle cx="12" cy="3" r="1" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground leading-none">
            Golly AI
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Activity planner</p>
        </div>
      </div>

      {/* Chat card */}
      <div className="rounded-2xl bg-card border border-border/50 overflow-hidden flex flex-col h-[calc(100vh-12rem)] max-h-[700px]">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mr-2.5 mt-0.5">
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                    className="text-primary"
                  >
                    <rect x="3" y="8" width="18" height="12" rx="3" />
                    <circle cx="9" cy="14" r="1.5" fill="currentColor" stroke="none" />
                    <circle cx="15" cy="14" r="1.5" fill="currentColor" stroke="none" />
                    <line x1="12" y1="8" x2="12" y2="4" />
                    <circle cx="12" cy="3" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </div>
              )}
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {thinking && (
            <div className="flex justify-start">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mr-2.5 mt-0.5">
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  className="text-primary"
                >
                  <rect x="3" y="8" width="18" height="12" rx="3" />
                  <circle cx="9" cy="14" r="1.5" fill="currentColor" stroke="none" />
                  <circle cx="15" cy="14" r="1.5" fill="currentColor" stroke="none" />
                  <line x1="12" y1="8" x2="12" y2="4" />
                  <circle cx="12" cy="3" r="1" fill="currentColor" stroke="none" />
                </svg>
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

        {/* Suggestion chips — show on first load */}
        {messages.length <= 1 && (
          <div className="px-5 pb-3 flex gap-2 flex-wrap shrink-0">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => void send(chip)}
                disabled={thinking}
                className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
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
            Golly AI can make mistakes. Always verify camp details directly with the host.
          </p>
        </div>
      </div>
    </main>
  );
}
