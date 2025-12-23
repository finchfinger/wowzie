// src/pages/host/ShareWithEmailModal.tsx
import React, { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";

type Props = {
  open: boolean;
  onClose: () => void;
  onShare?: (email: string) => Promise<void> | void;
};

export const ShareWithEmailModal: React.FC<Props> = ({ open, onClose, onShare }) => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setSubmitting(false);
    setError(null);
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter an email.");
      return;
    }

    try {
      setSubmitting(true);
      await onShare?.(trimmed);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Could not share. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Share by email"
    >
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl border border-black/10">
        <div className="p-5 border-b border-black/5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Share by email</p>
            <p className="text-xs text-gray-500">Send a secure invite link.</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-700">Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              placeholder="name@email.com"
              disabled={submitting}
            />
          </label>

          {error ? (
            <p className="text-xs text-red-600">{error}</p>
          ) : (
            <p className="text-[11px] text-gray-500">
              We’ll email them a link to view what you shared.
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShareWithEmailModal;
