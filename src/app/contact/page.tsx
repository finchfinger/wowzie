"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert } from "@/components/ui/Alert";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const canSend = useMemo(() => {
    const n = name.trim();
    const e = replyTo.trim();
    const s = subject.trim();
    const m = message.trim();
    if (!n || !e || !s || !m) return false;
    if (!e.includes("@") || !e.includes(".")) return false;
    return true;
  }, [name, replyTo, subject, message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || !canSend) return;
    setSending(true);
    setToast(null);
    try {
      const { error } = await supabase.functions.invoke("contact", {
        body: {
          to: "flatmade@gmail.com",
          reply_to: replyTo.trim(),
          name: name.trim(),
          subject: subject.trim(),
          message: message.trim(),
          source: "wowzi_contact_page",
          created_at_iso: new Date().toISOString(),
        },
      });
      if (error) {
        setToast({ tone: "error", text: "We couldn't send your message. Please try again." });
        return;
      }
      setName("");
      setReplyTo("");
      setSubject("");
      setMessage("");
      setToast({ tone: "success", text: "Message sent. We'll get back to you soon." });
    } catch {
      setToast({ tone: "error", text: "We couldn't send your message. Please try again." });
    } finally {
      setSending(false);
    }
  };

  return (
    <main>
      <div className="page-container py-10">
        <div className="page-grid">
          <div className="span-8-center">
      <PageHeader title="Contact" subtitle="Send us a note. We read every message." />

      <div className="rounded-card bg-card p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Your name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John" disabled={sending} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
              <Input type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="you@example.com" disabled={sending} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What can we help with?" disabled={sending} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Message</label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={7} placeholder="Tell us what's up. If this is about a booking, include the camp name and date." disabled={sending} />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Please don&apos;t include sensitive info like passwords or full payment details.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Button type="submit" disabled={sending || !canSend}>
              {sending ? "Sending..." : "Send message"}
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Prefer email?{" "}
              <a href="mailto:flatmade@gmail.com" className="underline hover:text-foreground">
                flatmade@gmail.com
              </a>
            </p>
          </div>
        </form>
      </div>

      {toast && (
        <Alert tone={toast.tone} className="mt-4">{toast.text}</Alert>
      )}
          </div>
        </div>
      </div>
    </main>
  );
}
