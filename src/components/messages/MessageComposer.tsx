// src/components/messages/MessageComposer.tsx
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cx } from "./utils";

type Props = {
  active: boolean;
  placeholder: string;
  value: string;
  sending?: boolean;
  onChange: (v: string) => void;

  // attachment is passed back on send
  onSend: (e: React.FormEvent, attachment?: File | null) => void;
  enterToSend?: boolean;
};

// Minimal, pragmatic Slack-style shortcode map.
// Add more as you want. Keys are lowercase.
const EMOJI_BY_CODE: Record<string, string> = {
  smile: "😄",
  grin: "😁",
  grinning: "😀",
  joy: "😂",
  laughing: "😆",
  wink: "😉",
  blush: "😊",
  relaxed: "☺️",
  slightly_smiling_face: "🙂",
  smiley: "😃",
  upside_down_face: "🙃",
  thinking: "🤔",
  neutral_face: "😐",
  rolling_eyes: "🙄",
  sob: "😭",
  cry: "😢",
  angry: "😠",
  heart: "❤️",
  yellow_heart: "💛",
  green_heart: "💚",
  blue_heart: "💙",
  purple_heart: "💜",
  broken_heart: "💔",
  thumbs_up: "👍",
  thumbsup: "👍",
  thumbsdown: "👎",
  clap: "👏",
  pray: "🙏",
  fire: "🔥",
  star: "⭐",
  sparkles: "✨",
  tada: "🎉",
  wave: "👋",
  raised_hands: "🙌",
  ok_hand: "👌",
  eyes: "👀",
  rocket: "🚀",
  coffee: "☕",
  warning: "⚠️",
  check: "✅",
  white_check_mark: "✅",
  x: "❌",
  heavy_multiplication_x: "✖️",
  plus1: "👍",
  minus1: "👎",
  point_up: "☝️",
  point_down: "👇",
  point_left: "👈",
  point_right: "👉",
};

const EMOJI_ALIASES: Record<string, string> = {
  "+1": "plus1",
  "-1": "minus1",
  thumbsup: "thumbs_up",
  thumbsdown: "thumbsdown",
  hi: "wave",
  party: "tada",
  yay: "tada",
  lol: "joy",
  rofl: "joy",
  sad: "cry",
};

const EMOTICON_MAP: Array<{ from: string; to: string }> = [
  { from: ":)", to: "🙂" },
  { from: ":-)", to: "🙂" },
  { from: ":D", to: "😄" },
  { from: ":-D", to: "😄" },
  { from: ";)", to: "😉" },
  { from: ";-)", to: "😉" },
  { from: ":(", to: "☹️" },
  { from: ":-(", to: "☹️" },
  { from: ":P", to: "😛" },
  { from: ":-P", to: "😛" },
];

function resolveEmoji(codeRaw: string): string | null {
  const code = String(codeRaw || "").trim().toLowerCase();
  if (!code) return null;

  const aliased = EMOJI_ALIASES[code] ?? code;
  return EMOJI_BY_CODE[aliased] ?? null;
}

function isWordChar(ch: string) {
  return /[a-z0-9_+\-]/i.test(ch);
}

/**
 * Apply Slack-style replacements around the cursor only.
 * This avoids rewriting the whole string and keeps selection stable.
 */
function applyEmojiReplacements(input: string, cursor: number) {
  let next = input;
  let nextCursor = cursor;

  // Helper to replace a slice and shift cursor.
  const replaceRange = (start: number, end: number, replacement: string) => {
    next = next.slice(0, start) + replacement + next.slice(end);
    const replacedLen = end - start;
    const delta = replacement.length - replacedLen;
    if (nextCursor >= end) nextCursor += delta;
    else if (nextCursor > start) nextCursor = start + replacement.length;
  };

  const left = next.slice(0, nextCursor);
  const right = next.slice(nextCursor);

  // 1) Emoticons like :) convert when user finishes them or types a space after them.
  // We check the last ~6 chars before cursor.
  const emoticonWindow = left.slice(Math.max(0, left.length - 6));
  for (const { from, to } of EMOTICON_MAP) {
    if (emoticonWindow.endsWith(from)) {
      const start = left.length - from.length;
      const end = left.length;
      replaceRange(start, end, to);
      break;
    }
    // If user typed space after it, handle " :) " case.
    if (emoticonWindow.endsWith(from + " ")) {
      const start = left.length - (from.length + 1);
      const end = left.length - 1;
      replaceRange(start, end, to);
      break;
    }
  }

  // Refresh left after emoticon replacement
  const left2 = next.slice(0, nextCursor);

  // 2) Slack-style :shortcode: replacement.
  // Trigger when the user types ":" to close, or when typing space after a complete code.
  // We look back up to 64 chars for the nearest valid pattern ending at cursor or before a trailing space.
  const lookback = left2.slice(Math.max(0, left2.length - 64));

  const tryReplaceShortcodeEndingAt = (endingIndexInLeft: number) => {
    // endingIndexInLeft is index in left2 where the trailing ":" ends (exclusive),
    // so the last character in the code is ":" at endingIndexInLeft - 1.
    const endPos = endingIndexInLeft; // exclusive
    const colonClosePos = endPos - 1;
    if (left2[colonClosePos] !== ":") return false;

    // Find matching ":" open before it with only word chars between.
    let openPos = colonClosePos - 1;
    while (openPos >= 0 && isWordChar(left2[openPos])) openPos--;
    if (openPos < 0) return false;
    if (left2[openPos] !== ":") return false;

    const code = left2.slice(openPos + 1, colonClosePos);
    if (!code) return false;

    const emoji = resolveEmoji(code);
    if (!emoji) return false;

    replaceRange(openPos, colonClosePos + 1, emoji);
    return true;
  };

  // Case A: cursor is right after ":" (user just typed the closing colon)
  if (left2.endsWith(":")) {
    tryReplaceShortcodeEndingAt(left2.length);
  } else if (left2.endsWith(" ")) {
    // Case B: user typed a space, replace if immediately before space we have :code:
    // left2 ends with space, so try ending at left2.length - 1
    tryReplaceShortcodeEndingAt(left2.length - 1);
  } else {
    // Case C: user pasted text that ends with :code:
    // Only attempt if the lookback contains a :word: ending at cursor
    if (lookback.includes(":") && left2.endsWith(":")) {
      tryReplaceShortcodeEndingAt(left2.length);
    }
  }

  return { value: next, cursor: nextCursor, right };
}

export const MessageComposer: React.FC<Props> = ({
  active,
  placeholder,
  value,
  sending,
  onChange,
  onSend,
  enterToSend = true,
}) => {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [attachment, setAttachment] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Cursor preservation across controlled updates
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  useEffect(() => {
    if (!attachment) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(attachment);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [attachment]);

  useLayoutEffect(() => {
    const sel = pendingSelectionRef.current;
    const el = taRef.current;
    if (!sel || !el) return;

    // Clamp within current value
    const max = el.value.length;
    const start = Math.max(0, Math.min(sel.start, max));
    const end = Math.max(0, Math.min(sel.end, max));

    try {
      el.setSelectionRange(start, end);
    } catch {
      // ignore
    }
    pendingSelectionRef.current = null;
  }, [value]);

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    setAttachment(f);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    if (!value.trim() && !attachment) return;

    onSend(e, attachment);

    setAttachment(null);
    setIsDragging(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <form
      onSubmit={submit}
      className="border-t border-black/5 bg-white px-3 sm:px-4 py-2"
      onDragEnter={(e) => {
        if (!active || sending) return;
        if (e.dataTransfer.types?.includes("Files")) setIsDragging(true);
      }}
      onDragOver={(e) => {
        if (!active || sending) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setIsDragging(false);
      }}
      onDrop={(e) => {
        if (!active || sending) return;
        e.preventDefault();
        setIsDragging(false);

        const f = e.dataTransfer.files?.[0] ?? null;
        pickFile(f);
      }}
    >
      {isDragging ? (
        <div className="mb-2 rounded-2xl border border-dashed border-black/20 bg-gray-50 px-3 py-3 text-xs text-gray-700">
          Drop an image to attach
        </div>
      ) : null}

      {previewUrl ? (
        <div className="mb-2 flex items-center gap-2">
          <div className="h-14 w-14 overflow-hidden rounded-xl border border-black/10 bg-gray-50">
            <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-900">{attachment?.name}</p>
            <p className="text-[11px] text-gray-500">
              {(attachment?.size ? Math.round(attachment.size / 1024) : 0)} KB
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setAttachment(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            Remove
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <button
          type="button"
          disabled={!active || sending}
          onClick={() => fileRef.current?.click()}
          className={cx(
            "min-h-[44px] inline-flex w-11 items-center justify-center rounded-2xl border border-black/10 bg-white text-gray-700",
            !active || sending ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
          )}
          aria-label="Attach image"
          title="Attach image"
        >
          📎
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />

        <textarea
          ref={taRef}
          rows={1}
          value={value}
          onChange={(e) => {
            const raw = e.target.value;
            const cursor = e.target.selectionStart ?? raw.length;
            const { value: nextValue, cursor: nextCursor } = applyEmojiReplacements(raw, cursor);

            // Save desired selection so it applies after controlled rerender
            pendingSelectionRef.current = { start: nextCursor, end: nextCursor };
            onChange(nextValue);
          }}
          placeholder={placeholder}
          disabled={!active}
          onPaste={(e) => {
            if (!active || sending) return;

            const items = Array.from(e.clipboardData?.items ?? []);
            const imageItem = items.find((it) => it.type.startsWith("image/"));
            if (imageItem) {
              const file = imageItem.getAsFile();
              if (file) {
                e.preventDefault();
                pickFile(file);
                return;
              }
            }

            // Allow paste, but after paste lands, run shortcode conversion once.
            // We cannot read the post-paste value synchronously.
            requestAnimationFrame(() => {
              const el = taRef.current;
              if (!el) return;
              const raw = el.value;
              const cursor = el.selectionStart ?? raw.length;
              const { value: nextValue, cursor: nextCursor } = applyEmojiReplacements(raw, cursor);
              pendingSelectionRef.current = { start: nextCursor, end: nextCursor };
              onChange(nextValue);
            });
          }}
          onKeyDown={(e) => {
            if (!enterToSend) return;
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (active && (value.trim() || attachment) && !sending) {
                (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
              }
            }
          }}
          className="flex-1 min-h-[44px] max-h-[160px] resize-none rounded-2xl border border-black/10 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-100 disabled:text-gray-400"
        />

        <button
          type="submit"
          disabled={!active || (!value.trim() && !attachment) || sending}
          className={cx(
            "min-h-[44px] inline-flex items-center justify-center rounded-2xl px-3 py-2 text-sm font-medium",
            !active || (!value.trim() && !attachment) || sending
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-gray-900 text-white hover:bg-black"
          )}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
};
