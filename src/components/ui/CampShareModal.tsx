// src/components/ui/CampShareModal.tsx
import React, { useEffect, useState } from "react";
import Modal from "./Modal";
import { Button } from "./Button";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  campName: string;
  url: string;
  onShareEmail?: (email: string) => Promise<void>;
};

export const CampShareModal: React.FC<Props> = ({
  isOpen,
  onClose,
  campName,
  url,
  onShareEmail,
}) => {
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setEmail("");
    setNotice(null);
    setError(null);
    setSubmitting(false);
  }, [isOpen]);

  const handleCopy = async () => {
    setError(null);
    setNotice(null);

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        setNotice("Link copied.");
      } else {
        window.prompt("Copy this link:", url);
        setNotice("Copy the link from the prompt.");
      }
    } catch {
      setError("Could not copy the link.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim()) {
      setError("Please enter an email.");
      return;
    }

    try {
      setSubmitting(true);
      await onShareEmail?.(email.trim());
      setNotice("Invite sent.");
      setTimeout(onClose, 600);
    } catch (err: any) {
      setError(err?.message ?? "Could not send invite.");
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share this camp" size="md">
      <p className="text-sm text-gray-600 mb-4">Invite someone to view “{campName}”.</p>

      {/* Copy link */}
      <div className="mb-5 rounded-xl border border-black/10 bg-gray-50 p-3">
        <p className="text-[11px] text-gray-600 mb-2">Share link</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-xs"
          />
          <Button variant="outline" onClick={handleCopy} type="button">
            Copy
          </Button>
        </div>
      </div>

      {/* Email */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-gray-700">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            placeholder="name@email.com"
            disabled={submitting}
          />
        </label>

        {error && <p className="text-xs text-red-600">{error}</p>}
        {notice && <p className="text-xs text-emerald-700">{notice}</p>}

        <div className="flex justify-end gap-2 pt-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send invite"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CampShareModal;
