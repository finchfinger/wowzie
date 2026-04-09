"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";

/* ── Suggestion chips ───────────────────────────────────── */
const CHIPS: Array<{ icon: string; label: string }> = [
  { icon: "sports_soccer", label: "Soccer camps near me" },
  { icon: "wb_sunny",      label: "Summer camps in Chicago" },
  { icon: "draw",          label: "Art classes for 7 year olds" },
  { icon: "code",          label: "Beginner coding classes" },
];

/* ── Types ──────────────────────────────────────────────── */
type Role = "user" | "assistant";
type Message = { id: string; role: Role; text: string };
type ApiMessage = { role: Role; content: string };

let msgCounter = 0;
const newId = () => `msg-${++msgCounter}`;

async function streamReply(
  messages: ApiMessage[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
) {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`API error ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

/* ── ScoutOverlay ───────────────────────────────────────── */
export function ScoutOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const firstName =
    (user?.user_metadata?.first_name as string | undefined)?.trim() ||
    null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isEmpty = messages.length === 0;

  /* focus input when opened */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  /* scroll to bottom on new messages */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  /* abort in-flight request on close */
  useEffect(() => {
    if (!open) abortRef.current?.abort();
  }, [open]);

  /* close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const send = async (text?: string) => {
    const body = (text ?? input).trim();
    if (!body || thinking) return;
    setInput("");

    const history: ApiMessage[] = [
      ...messages.map((m) => ({ role: m.role, content: m.text })),
      { role: "user" as const, content: body },
    ];

    const userMsg: Message = { id: newId(), role: "user", text: body };
    setMessages((p) => [...p, userMsg]);
    setThinking(true);

    const replyId = newId();
    setMessages((p) => [...p, { id: replyId, role: "assistant", text: "" }]);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamReply(
        history,
        (chunk) => setMessages((p) =>
          p.map((m) => m.id === replyId ? { ...m, text: m.text + chunk } : m)
        ),
        controller.signal,
      );
    } catch (err: unknown) {
      if (!controller.signal.aborted) {
        setMessages((p) =>
          p.map((m) =>
            m.id === replyId ? { ...m, text: "Sorry, something went wrong." } : m
          )
        );
      }
    } finally {
      setThinking(false);
      abortRef.current = null;
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.18)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ask Scout"
        className="fixed z-50 flex flex-col"
        style={{
          top: "8px",
          right: "8px",
          bottom: "8px",
          width: "clamp(320px, 33vw, 440px)",
          borderRadius: "20px",
          background: "#FDFBFF",
          transform: open ? "translateX(0)" : "translateX(calc(100% + 8px))",
          transition: "transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: open ? "0 4px 32px rgba(103,80,164,0.14), 0 1px 4px rgba(103,80,164,0.08)" : "none",
        }}
      >
        <style>{`
          @media (max-width: 639px) {
            [role="dialog"][aria-label="Ask Scout"] {
              top: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              width: 100% !important;
              border-radius: 0 !important;
              box-shadow: none !important;
            }
          }
        `}</style>
        {/* Close button */}
        <div className="flex justify-end px-4 pt-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Scout"
            className="h-9 w-9 flex items-center justify-center rounded-full transition-colors"
            style={{ color: "#49454F" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#E8DEF8")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <span className="material-symbols-rounded select-none" style={{ fontSize: 20, lineHeight: 1 }}>close</span>
          </button>
        </div>

        {isEmpty ? (
          /* ── Empty state ── */
          <>
            <div className="px-4 pt-2 pb-4 shrink-0">
              {/* Greeting */}
              <div className="flex items-center gap-2 mb-3">
                {/* Gradient ring + explore icon */}
                <span
                  className="inline-flex items-center justify-center h-6 w-6 rounded-full"
                  style={{
                    background: "linear-gradient(135deg, #a855f7, #4f46e5)",
                    padding: "1.5px",
                  }}
                >
                  <span className="flex items-center justify-center h-full w-full rounded-full bg-white">
                    <span
                      className="material-symbols-rounded select-none"
                      style={{ fontSize: 13, lineHeight: 1, color: "#7c3aed" }}
                    >
                      explore
                    </span>
                  </span>
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {firstName ? `Hi ${firstName}` : "Hi there"}
                </span>
              </div>

              {/* Heading */}
              <h2 className="text-[26px] font-semibold leading-snug" style={{ color: "#1C1B1F", letterSpacing: "-0.01em" }}>
                Let&apos;s find the right camp or class.
              </h2>
            </div>

            {/* Chips — M3 suggestion chips, full width stacked */}
            <div className="px-4 flex flex-col gap-2 flex-1 overflow-y-auto">
              {CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => void send(chip.label)}
                  className="flex items-center gap-3 w-full text-sm font-medium text-left transition-colors"
                  style={{
                    background: "#EDE7F6",
                    color: "#1C1B1F",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    border: "none",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#E1D5F5")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#EDE7F6")}
                >
                  <span
                    className="material-symbols-rounded select-none shrink-0"
                    style={{ fontSize: 18, lineHeight: 1, color: "#6750A4" }}
                  >
                    {chip.icon}
                  </span>
                  {chip.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          /* ── Chat state ── */
          <div className="flex-1 overflow-y-auto px-4 pt-2 pb-2 space-y-3 min-h-0">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[82%] text-sm leading-relaxed whitespace-pre-wrap"
                  style={{
                    borderRadius: msg.role === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                    padding: "10px 14px",
                    background: msg.role === "user" ? "#E8DEF8" : "#ECE6F0",
                    color: "#1C1B1F",
                  }}
                >
                  {msg.text || (thinking && msg.role === "assistant" ? (
                    <span className="flex gap-1 items-center py-0.5">
                      <span className="h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:0ms]" style={{ background: "#6750A4", opacity: 0.5 }} />
                      <span className="h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:150ms]" style={{ background: "#6750A4", opacity: 0.5 }} />
                      <span className="h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:300ms]" style={{ background: "#6750A4", opacity: 0.5 }} />
                    </span>
                  ) : "")}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Input — pinned to bottom, M3 search-bar style */}
        <div className="px-4 py-4 shrink-0">
          <div
            className="flex items-center gap-2 h-14"
            style={{
              background: "#E8DEF8",
              borderRadius: "28px",
              padding: "0 8px 0 20px",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about camps, classes, or availability"
              disabled={thinking}
              className="flex-1 bg-transparent text-sm outline-none disabled:opacity-50 min-w-0"
              style={{ color: "#1C1B1F" }}
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={!input.trim() || thinking}
              aria-label="Send"
              className="h-10 w-10 flex items-center justify-center rounded-full transition-opacity disabled:opacity-30 hover:opacity-90 shrink-0"
              style={{ background: "#6750A4", color: "#fff" }}
            >
              <span className="material-symbols-rounded select-none" style={{ fontSize: 20, lineHeight: 1 }}>arrow_upward</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
