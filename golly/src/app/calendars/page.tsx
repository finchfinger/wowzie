"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useMyCalendar } from "@/hooks/useMyCalendar";
import { CalendarEventList } from "@/components/calendar/CalendarEventList";
import { CalendarMonthGrid } from "@/components/calendar/CalendarMonthGrid";
import { toast } from "sonner";
import { CalendarDays, Link2, X, Share2, ChevronRight } from "lucide-react";

/* ── Types ──────────────────────────────────────────── */

type CalendarTab = "my" | "shared";

type SharedCalendar = {
  id: string;
  name: string;
  addedOn: string;
  emoji?: string;
};

/* ── Share Modal ─────────────────────────────────────── */

function ShareCalendarModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [senderId, setSenderId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setMessage("");
    setStatus("");
    setShareUrl(null);
    setShareToken(null);
    setSenderId(null);

    const init = async () => {
      const { data: userRes, error } = await supabase.auth.getUser();
      if (error || !userRes.user) {
        setStatus("Please sign in to share your calendar.");
        return;
      }
      const token = crypto.randomUUID();
      const url = `${window.location.origin}/calendars/shared?token=${encodeURIComponent(token)}`;
      setSenderId(userRes.user.id);
      setShareToken(token);
      setShareUrl(url);
    };
    void init();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    } catch {
      setStatus("Could not copy link.");
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareToken || !senderId) return;
    if (!email.trim()) { setStatus("Please enter an email address."); return; }
    setSending(true);
    setStatus("");

    try {
      const { error } = await supabase.from("calendar_shares").insert([{
        email: email.trim().toLowerCase(),
        message: message.trim() || null,
        token: shareToken,
        share_url: shareUrl,
        sender_id: senderId,
        status: "pending",
        sent_at: new Date().toISOString(),
      }]);
      if (error) throw error;
      setStatus("Calendar shared! The recipient will get a link to view your schedule.");
      setEmail("");
      setMessage("");
    } catch (err: any) {
      setStatus(err?.message || "Could not share. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Share your calendar</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Invite a parent or host to view your schedule.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Recipient email
            </label>
            <input
              type="email"
              required
              placeholder="parent@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Message <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Hi, here's my calendar for the summer…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
            />
          </div>

          {shareUrl && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 text-xs text-primary hover:text-primary/80 font-medium"
            >
              <Link2 className="h-3.5 w-3.5" />
              Copy share link instead
            </button>
          )}

          {status && (
            <p className={`text-xs ${status.includes("shared") ? "text-emerald-600" : "text-muted-foreground"}`}>
              {status}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-border bg-background py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !senderId}
              className="flex-1 rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {sending ? "Sending…" : "Send invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Shared Calendar List ────────────────────────────── */

function SharedCalendarList({ calendars }: { calendars: SharedCalendar[] }) {
  if (!calendars.length) {
    return (
      <div className="flex flex-col items-center text-center py-16 rounded-2xl bg-card border border-border/50">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl">
          😌
        </div>
        <p className="text-sm font-medium text-foreground">Looks a little quiet here</p>
        <p className="mt-1 text-xs text-muted-foreground max-w-xs">
          Shared calendars will appear here once another host or parent gives you access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {calendars.map((cal) => {
        const addedLabel = new Date(cal.addedOn).toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        return (
          <button
            key={cal.id}
            type="button"
            className="w-full flex items-center gap-3 rounded-2xl bg-card border border-border/50 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
          >
            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-amber-100 text-lg shrink-0">
              {cal.emoji || "📌"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{cal.name}&apos;s calendar</p>
              <p className="text-xs text-muted-foreground">Added {addedLabel}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        );
      })}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────── */

export default function CalendarsPage() {
  const [activeTab, setActiveTab] = useState<CalendarTab>("my");
  const [shareOpen, setShareOpen] = useState(false);

  const {
    events,
    unscheduled,
    loading,
    error,
    viewMonth,
    setViewMonth,
    eventsByDate,
    nextEvent,
    jumpToNextEvent,
  } = useMyCalendar();

  // TODO: wire to Supabase calendar_shares table
  const sharedCalendars: SharedCalendar[] = [];

  const tabs: Array<{ id: CalendarTab; label: string }> = [
    { id: "my", label: "My Calendar" },
    { id: "shared", label: "Shared" },
  ];

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Calendars</h1>
          </div>

          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity"
          >
            <Share2 className="h-4 w-4" />
            Share my calendar
          </button>
        </div>

        {/* Next event banner */}
        {nextEvent && (
          <button
            type="button"
            onClick={jumpToNextEvent}
            className="w-full mb-5 flex items-center justify-between gap-3 rounded-2xl bg-primary/8 border border-primary/20 px-4 py-3 text-left hover:bg-primary/12 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🎉</span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Next up: {nextEvent.camp.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(nextEvent.start_at).toLocaleDateString(undefined, {
                    weekday: "long", month: "long", day: "numeric",
                  })}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-muted/50 rounded-full p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`rounded-full px-5 py-1.5 text-sm font-medium transition-all ${
                activeTab === t.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* My Calendar */}
        {activeTab === "my" && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)] gap-6">
            {/* Event list */}
            <div>
              <CalendarEventList events={events} loading={loading} error={error} />

              {/* Unscheduled bookings */}
              {!loading && unscheduled.length > 0 && (
                <div className="mt-8">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    No date confirmed yet
                  </p>
                  <div className="space-y-2">
                    {unscheduled.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 rounded-xl bg-card border border-border/50 px-4 py-3"
                      >
                        <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden shrink-0">
                          {u.camp.image_url && (
                            <img src={u.camp.image_url} alt={u.camp.name} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{u.camp.name}</p>
                          <p className="text-xs text-muted-foreground">Date to be announced</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Month grid */}
            <div className="hidden lg:block">
              <CalendarMonthGrid
                viewMonth={viewMonth}
                setViewMonth={setViewMonth}
                eventsByDate={eventsByDate}
              />
            </div>
          </div>
        )}

        {/* Shared Calendars */}
        {activeTab === "shared" && (
          <SharedCalendarList calendars={sharedCalendars} />
        )}
      </div>

      <ShareCalendarModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </main>
  );
}
