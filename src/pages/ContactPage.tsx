// src/pages/ContactPage.tsx
import React, { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

import { Container } from "../components/layout/Container";
import { SectionHeader } from "../components/layout/SectionHeader";

import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Button } from "../components/ui/Button";
import { Snackbar } from "../components/ui/Snackbar";

type Tone = "success" | "error" | "info";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

// ✅ Named export (so `import { ContactPage } ...` works)
export const ContactPage: React.FC = () => {
  const [name, setName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarTone, setSnackbarTone] = useState<Tone>("info");
  const [snackbarText, setSnackbarText] = useState("");

  const canSend = useMemo(() => {
    const n = name.trim();
    const e = replyTo.trim();
    const s = subject.trim();
    const m = message.trim();
    if (!n || !e || !s || !m) return false;
    if (!e.includes("@") || !e.includes(".")) return false;
    return true;
  }, [name, replyTo, subject, message]);

  const showToast = (tone: Tone, text: string) => {
    setSnackbarTone(tone);
    setSnackbarText(text);
    setSnackbarOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;

    if (!canSend) {
      showToast("error", "Please fill out all fields with a valid email.");
      return;
    }

    const payload = {
      to: "flatmade@gmail.com",
      reply_to: replyTo.trim(),
      name: name.trim(),
      subject: subject.trim(),
      message: message.trim(),
      source: "wowzie_contact_page",
      created_at_iso: new Date().toISOString(),
    };

    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("contact", {
        body: payload,
      });

      if (error) {
        console.error("[ContactPage] contact function error:", error);
        showToast(
          "error",
          "We couldn’t send your message. Please try again in a moment."
        );
        return;
      }

      console.log("[ContactPage] contact sent:", data);

      setName("");
      setReplyTo("");
      setSubject("");
      setMessage("");
      showToast("success", "Message sent. We’ll get back to you soon.");
    } catch (err) {
      console.error("[ContactPage] unexpected error:", err);
      showToast("error", "We couldn’t send your message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="flex-1 bg-gray-100">
      <Container className="py-10">
        <div className="max-w-3xl">
          <SectionHeader
            title="Contact"
            subtitle="Send us a note. We read every message."
            className="mb-6"
          />

          <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Your name
                  </label>
                  <Input
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setName(e.target.value)
                    }
                    placeholder="John"
                    disabled={sending}
                    aria-label="Your name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={replyTo}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setReplyTo(e.target.value)
                    }
                    placeholder="you@example.com"
                    disabled={sending}
                    aria-label="Email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <Input
                  value={subject}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSubject(e.target.value)
                  }
                  placeholder="What can we help with?"
                  disabled={sending}
                  aria-label="Subject"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Message
                </label>
                <Textarea
                  value={message}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setMessage(e.target.value)
                  }
                  rows={7}
                  placeholder="Tell us what’s up. If this is about a booking, include the camp name and date."
                  disabled={sending}
                  aria-label="Message"
                />
                <p className="mt-2 text-[11px] text-gray-500">
                  Please don’t include sensitive info like passwords or full
                  payment details.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Button
                  type="submit"
                  disabled={sending || !canSend}
                  className={cx("rounded-full", (!canSend || sending) && "opacity-70")}
                >
                  {sending ? "Sending…" : "Send message"}
                </Button>

                <p className="text-[11px] text-gray-500">
                  Prefer email?{" "}
                  <a
                    href="mailto:flatmade@gmail.com"
                    className="underline hover:text-gray-900"
                  >
                    flatmade@gmail.com
                  </a>
                </p>
              </div>
            </form>
          </div>

          <div className="mt-6 rounded-2xl bg-white border border-black/5 shadow-sm p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-gray-900">
              Other ways to reach us
            </h2>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl border border-black/5 bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-700">Email</p>
                <a
                  href="mailto:flatmade@gmail.com"
                  className="mt-1 inline-block text-sm text-gray-900 underline hover:text-black"
                >
                  flatmade@gmail.com
                </a>
                <p className="mt-2 text-[11px] text-gray-500">
                  General support and product questions.
                </p>
              </div>

              <div className="rounded-xl border border-black/5 bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-700">Help center</p>
                <a
                  href="/help"
                  className="mt-1 inline-block text-sm text-gray-900 underline hover:text-black"
                >
                  Browse help articles
                </a>
                <p className="mt-2 text-[11px] text-gray-500">
                  Booking, cancellations, hosting, and safety.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Container>

      <Snackbar
        open={snackbarOpen}
        tone={snackbarTone}
        message={snackbarText}
        onClose={() => setSnackbarOpen(false)}
      />
    </main>
  );
};

// ✅ Default export (so `import ContactPage ...` works too)
export default ContactPage;
