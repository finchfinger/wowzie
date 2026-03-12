"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Check, Copy, X } from "lucide-react";
import { toast } from "sonner";

export type ShareCalendarModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** The authenticated user's ID */
  userId: string;
  /** Sender's first name — shown in the invite email */
  senderName?: string;
};

/**
 * Unified "Invite a friend / Share your calendar" modal.
 *
 * On open it immediately writes a `calendar_shares` row so the link
 * is always valid — even if the user only copies it and never sends email.
 * When they click "Send invite" we update the row with the email and fire
 * an in-app notification if the recipient already has an account.
 */
export function ShareCalendarModal({ isOpen, onClose, userId, senderName }: ShareCalendarModalProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareRowId, setShareRowId] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // On open: generate token + pre-insert the share row so the link is always valid
  useEffect(() => {
    if (!isOpen || !userId) return;

    const token = crypto.randomUUID().replaceAll("-", "");
    const url = `${window.location.origin}/calendars/shared?token=${token}`;
    setShareToken(token);
    setShareUrl(url);
    setShareRowId(null);
    setEmail("");
    setMessage("");
    setStatus(null);
    setCopied(false);

    void (async () => {
      const { data } = await supabase
        .from("calendar_shares")
        .insert({
          email: "link-only",
          token,
          share_url: url,
          sender_id: userId,
          status: "created",
          last_error: null,
        })
        .select("id")
        .single();
      if (data?.id) setShareRowId(data.id);
    })();
  }, [isOpen, userId]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied!");
    } catch {
      toast.error("Could not copy — try selecting the link manually.");
    }
  };

  const handleSend = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.includes("@")) {
      setStatus({ ok: false, text: "Please enter a valid email." });
      return;
    }
    if (!shareToken || !shareUrl) {
      setStatus({ ok: false, text: "Could not generate invite. Please try again." });
      return;
    }
    setSending(true);
    setStatus(null);

    try {
      // 1. Update the pre-inserted row with the target email (always works)
      if (shareRowId) {
        await supabase
          .from("calendar_shares")
          .update({ email: trimmedEmail, message: message.trim() || null, status: "pending" })
          .eq("id", shareRowId);
      } else {
        // Fallback: insert fresh if pre-insert hadn't finished
        const { data } = await supabase
          .from("calendar_shares")
          .insert({
            email: trimmedEmail,
            message: message.trim() || null,
            token: shareToken,
            share_url: shareUrl,
            sender_id: userId,
            status: "pending",
          })
          .select("id")
          .single();
        if (data?.id) setShareRowId(data.id);
      }

      // 2. Fire in-app notification if the recipient already has a Wowzi account (non-fatal)
      // Uses a SECURITY DEFINER RPC to look up auth.users by email — run once in Supabase SQL editor:
      //   create or replace function get_user_id_by_email(lookup_email text)
      //   returns uuid language sql security definer set search_path = public as $$
      //     select id from auth.users where lower(email) = lower(trim(lookup_email)) limit 1;
      //   $$;
      try {
        const [{ data: recipientUserId }, { data: sender }] = await Promise.all([
          supabase.rpc("get_user_id_by_email", { lookup_email: trimmedEmail }),
          supabase
            .from("profiles")
            .select("preferred_first_name, legal_name")
            .eq("id", userId)
            .maybeSingle(),
        ]);

        if (recipientUserId) {
          const senderName =
            sender?.preferred_first_name ||
            (sender?.legal_name ?? "").split(" ")[0] ||
            "Someone";

          await Promise.all([
            supabase
              .from("calendar_shares")
              .update({ recipient_user_id: recipientUserId as string })
              .eq("token", shareToken),
            supabase.from("notifications").insert({
              user_id: recipientUserId as string,
              type: "calendar_share_invite",
              title: `${senderName} shared their calendar with you`,
              body: message.trim() || "Tap to view their upcoming activities.",
              is_read: false,
              meta: { icon: "📅", share_url: shareUrl, sender_name: senderName },
            }),
          ]);
        }
      } catch {
        // Non-fatal — in-app notification is a bonus
      }

      // 3. Best-effort email via Resend API route — fire-and-forget, never blocks the UI
      void fetch("/api/send-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          shareUrl,
          senderName: senderName || undefined,
          message: message.trim() || null,
        }),
      }).catch(() => { /* email failed silently — invite + link still valid */ });

      toast.success("Invite sent!");
      setEmail("");
      setMessage("");
      setStatus(null);
      onClose();

      // Rotate to a fresh token so the next send is its own unique invite
      const nextToken = crypto.randomUUID().replaceAll("-", "");
      const nextUrl = `${window.location.origin}/calendars/shared?token=${nextToken}`;
      setShareToken(nextToken);
      setShareUrl(nextUrl);
      setShareRowId(null);

      void (async () => {
        const { data } = await supabase
          .from("calendar_shares")
          .insert({ email: "link-only", token: nextToken, share_url: nextUrl, sender_id: userId, status: "created" })
          .select("id")
          .single();
        if (data?.id) setShareRowId(data.id);
      })();
    } catch {
      toast.error("Could not send invite — copy the link and share it directly.");
      setStatus({ ok: false, text: "Could not save invite. Try copying the link instead." });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    onClose();
    setStatus(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="relative w-full max-w-md rounded-3xl bg-card shadow-xl">
        {/* Close */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pt-8 pb-6 space-y-5">
          {/* Header */}
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Invite a friend
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Share your calendar by link or email.
            </p>
          </div>

          {/* Copy link — always works */}
          <button
            type="button"
            onClick={() => void handleCopy()}
            disabled={!shareUrl}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-40"
          >
            {copied
              ? <Check className="h-4 w-4 text-emerald-600" />
              : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy link"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            <span>or send by email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Email
            </label>
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@email.com"
              disabled={sending}
              onKeyDown={(e) => { if (e.key === "Enter") void handleSend(); }}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow disabled:opacity-50"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Message{" "}
              <span className="font-normal opacity-60">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="Add a note…"
              disabled={sending}
              className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow disabled:opacity-50"
            />
          </div>

          {/* Status */}
          {status && (
            <p className={`text-xs ${status.ok ? "text-emerald-600" : "text-destructive"}`}>
              {status.text}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || !email.trim()}
              className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {sending ? "Sending…" : "Send invite"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
