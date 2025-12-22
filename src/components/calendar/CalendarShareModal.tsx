// src/components/calendar/CalendarShareModal.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Props = {
  open: boolean;
  onClose: () => void;
};

export const CalendarShareModal: React.FC<Props> = ({ open, onClose }) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string>("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const origin = window.location.origin || "";
    const token =
      typeof crypto !== "undefined" && (crypto as any).randomUUID
        ? (crypto as any).randomUUID()
        : Date.now().toString(36);

    const url = `${origin}/calendars?share=${encodeURIComponent(token)}`;

    setShareToken(token);
    setShareUrl(url);
    setStatus("");
  }, [open]);

  if (!open) return null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setStatus("Link copied to clipboard.");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Could not copy link.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !shareUrl || !shareToken) return;

    setStatus("Sending…");

    try {
      const { error } = await supabase.from("calendar_shares").insert([
        {
          email,
          message,
          token: shareToken,
          share_url: shareUrl,
        },
      ]);

      if (error) throw error;

      setStatus("Shared. You can send this link to the parent.");
      setEmail("");
      setMessage("");
    } catch (err) {
      console.error("Share save failed", err);
      setStatus("Could not save share. Please try again.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
    >
      <div className="mx-4 max-w-lg w-full">
        <div className="rounded-3xl bg-white shadow-xl p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Share calendar
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-900">
                Add email
              </label>
              <input
                type="email"
                required
                placeholder="parent@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Add message
              </label>
              <textarea
                rows={4}
                placeholder="Hi, here is the calendar for Jamie’s summer activities…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
            >
              <span>🔗</span>
              <span>Copy link</span>
            </button>

            {shareUrl && (
              <p className="mt-1 text-xs text-gray-400 break-all">
                {shareUrl}
              </p>
            )}

            <p className="text-xs text-gray-500">{status}</p>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center rounded-xl bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-black"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
