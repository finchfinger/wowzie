// src/components/calendar/ShareCalendarModal.tsx
import React, { useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { Snackbar } from "../ui/Snackbar";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSent?: () => void;
};

const TEST_EMAIL = "johnpaul+wowzie@finchfinger.com";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export const ShareCalendarModal: React.FC<Props> = ({ isOpen, onClose, onSent }) => {
  const [email, setEmail] = useState(TEST_EMAIL);
  const [message, setMessage] = useState("");

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  // Snackbar
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState("");

  // Resend testing mode: lock recipient email to your allowed test address
  const emailLocked = true;

  const emailOk = useMemo(() => isValidEmail(email), [email]);

  const showSnack = (msg: string) => {
    setSnackMsg(msg);
    setSnackOpen(true);
  };

  const close = () => {
    setEmail(TEST_EMAIL);
    setMessage("");
    setStatus("");
    setError("");
    setSnackOpen(false);
    setSnackMsg("");
    onClose();
  };

  const copyLink = async () => {
    setError("");
    setStatus("Creating link…");

    const { data, error: fnErr } = await supabase.functions.invoke("share-calendar", {
      body: { mode: "link_only", email: null, message: message.trim() || null },
    });

    if (fnErr) {
      setStatus("");
      const msg = fnErr.message || "Could not create link.";
      setError(msg);
      showSnack("Could not create link.");
      return;
    }

    const url = (data as any)?.share_url as string | undefined;
    if (!url) {
      setStatus("");
      setError("Could not create link.");
      showSnack("Could not create link.");
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setStatus("");
      showSnack("Link copied.");
    } catch {
      setStatus("");
      setError("Could not copy link. Please copy manually.");
      showSnack("Could not copy link.");
    }
  };

  const send = async () => {
    setError("");

    if (!emailOk) {
      setError("Enter a valid email.");
      showSnack("Enter a valid email.");
      return;
    }

    setStatus("Sending…");

    const { error: fnErr } = await supabase.functions.invoke("share-calendar", {
      body: { mode: "send", email: email.trim(), message: message.trim() || null },
    });

    if (fnErr) {
      setStatus("");
      const msg = fnErr.message || "Could not send invite.";
      setError(msg);
      showSnack("Invite failed to send.");
      return;
    }

    setStatus("");
    showSnack("Invite sent.");
    onSent?.();
    setTimeout(() => close(), 650);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={close} title="Share calendar">
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Add email</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={TEST_EMAIL}
              autoComplete="email"
              readOnly={emailLocked}
              error={!!error && email.length > 0 && !emailOk}
            />
            <p className="text-xs text-gray-500">
              Email invites are in testing mode. Sending is limited to {TEST_EMAIL}.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Add message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Optional note"
              rows={6}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
            >
              <span aria-hidden="true">🔗</span> Copy link
            </button>

            <div className="flex items-center gap-2">
              <Button variant="subtle" type="button" onClick={close}>
                Cancel
              </Button>
              <Button variant="primary" type="button" onClick={send} disabled={!emailOk}>
                Send
              </Button>
            </div>
          </div>

          {(status || error) && (
            <div>
              {status && <p className="text-xs text-gray-500">{status}</p>}
              {error && <p className="text-xs text-rose-600">{error}</p>}
            </div>
          )}
        </div>
      </Modal>

      <Snackbar
        message={snackMsg}
        open={snackOpen}
        onClose={() => setSnackOpen(false)}
        duration={2200}
      />
    </>
  );
};

export default ShareCalendarModal;
