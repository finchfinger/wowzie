import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

type ShareWithEmailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  activityTitle: string;
  onShare: (email: string) => Promise<void>;
};

const isValidEmail = (email: string) => {
  const v = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
};

export const ShareWithEmailModal: React.FC<ShareWithEmailModalProps> = ({
  isOpen,
  onClose,
  activityTitle,
  onShare,
}) => {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => isValidEmail(email) && !saving, [email, saving]);

  useEffect(() => {
    if (!isOpen) return;
    setEmail("");
    setSaving(false);
    setError(null);
  }, [isOpen]);

  const handleSubmit = async () => {
    setError(null);
    const cleaned = email.trim().toLowerCase();

    if (!isValidEmail(cleaned)) {
      setError("Enter a valid email address.");
      return;
    }

    setSaving(true);
    try {
      await onShare(cleaned);
      onClose();
    } catch (e) {
      console.error("[ShareWithEmailModal] share failed", e);
      setError("We couldn’t send this invite. Please try again.");
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share">
      <div className="space-y-5">
        <p className="text-sm text-gray-600">
          Invite someone to view <span className="font-medium text-gray-900">{activityTitle}</span>.
        </p>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-700">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@email.com"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-violet-200"
            autoFocus
          />
          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex items-center rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 disabled:opacity-60"
          >
            Cancel
          </button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="text-sm px-4 py-2"
          >
            {saving ? "Sending…" : "Send invite"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ShareWithEmailModal;
