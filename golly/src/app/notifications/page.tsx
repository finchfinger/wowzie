"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type Notification = {
  id: string;
  created_at: string;
  title?: string | null;
  body?: string | null;
  type?: string | null;
  is_read?: boolean | null;
  meta?: any | null;
};

const now = new Date();

const mockNotifications: Notification[] = [
  {
    id: "mock-1",
    created_at: now.toISOString(),
    type: "Calendar",
    title: "Sarah shared her calendar with you",
    body: "Tap to view upcoming camps and classes.",
    is_read: false,
    meta: { icon: "&#128197;" },
  },
  {
    id: "mock-2",
    created_at: now.toISOString(),
    type: "Message",
    title: "Camp Wildwood sent you a message",
    body: "We can't wait to see you tomorrow. Please use the front entrance for check-in.",
    is_read: false,
    meta: { icon: "&#9978;&#65039;" },
  },
];

function iconForType(type?: string | null, metaIcon?: string): string {
  if (type === "play_started") return "\uD83C\uDFC3";
  if (type === "play_joined") return "\uD83D\uDE4C";
  if (type === "play_ended") return "\uD83D\uDC4B";
  return metaIcon ?? "\uD83D\uDD14";
}

function formatRelativeTime(iso?: string): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr${diffHr > 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
}

type Filter = "all" | "unread";

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes?.user;
        if (!user) {
          setItems(mockNotifications);
          setUserId(null);
          setLoading(false);
          return;
        }
        setUserId(user.id);
        const { data, error } = await supabase
          .from("notifications")
          .select("id, created_at, title, body, type, is_read, meta")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error || !data) {
          setItems(mockNotifications);
        } else {
          setItems(data as Notification[]);
        }
      } catch {
        setError("We couldn't load notifications right now.");
        setItems(mockNotifications);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const unreadCount = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

  const filteredItems = useMemo(() => {
    if (filter === "unread") return items.filter((n) => !n.is_read);
    return items;
  }, [items, filter]);

  const handleDeleteOne = async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    if (!userId) return;
    const { error } = await supabase.from("notifications").delete().eq("id", id).eq("user_id", userId);
    if (error) console.error("[notifications] delete failed:", error.message);
  };

  const handleToggleRead = async (id: string, nextIsRead: boolean) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: nextIsRead } : n)));
    if (!userId) return;
    const { error } = await supabase.from("notifications").update({ is_read: nextIsRead }).eq("id", id).eq("user_id", userId);
    if (error) console.error("[notifications] toggle read failed:", error.message);
  };

  const handleDeleteAll = async () => {
    setItems([]);
    if (!userId) return;
    const { error } = await supabase.from("notifications").delete().eq("user_id", userId);
    if (error) console.error("[notifications] delete all failed:", error.message);
  };

  const handleMarkAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    if (!userId) return;
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId);
    if (error) console.error("[notifications] mark all read failed:", error.message);
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Updates about bookings, messages, and shared calendars.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Button variant="outline" size="sm" onClick={handleDeleteAll} disabled={items.length === 0}>
            Delete all
          </Button>
          <Button size="sm" onClick={handleMarkAllRead} disabled={items.length === 0 || unreadCount === 0}>
            Mark all as read
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-2">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
          className="h-9 rounded-xl border border-input bg-transparent px-2.5 text-sm text-foreground hover:bg-gray-50 focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-colors"
        >
          <option value="all">All</option>
          <option value="unread">Unread</option>
        </select>
        <span className="text-xs text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        </span>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading notifications...</p>}
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <section className="space-y-3">
        {filteredItems.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">
            {filter === "unread" ? "No unread notifications right now." : "You're all caught up. No notifications right now."}
          </p>
        ) : (
          filteredItems.map((notification) => {
            const unread = !notification.is_read;
            const icon = iconForType(notification.type, notification.meta?.icon);
            const tag = notification.type === "play_started"
              ? "Playing"
              : notification.type === "play_joined"
              ? "Playing"
              : notification.type === "play_ended"
              ? "Playing"
              : notification.type ?? "Update";

            return (
              <article
                key={notification.id}
                className={`rounded-2xl px-4 py-3 sm:px-5 sm:py-4 ${unread ? "bg-primary/5" : ""}`}
              >
                <div className="flex gap-3">
                  <div className="mt-1 text-xl shrink-0">{icon}</div>
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug">
                          {notification.title || "Notification"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatRelativeTime(notification.created_at)}
                          {tag ? <span> &middot; {tag}</span> : null}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleRead(notification.id, !!unread)}
                          className="h-2.5 w-2.5 rounded-full mt-1"
                          style={{ backgroundColor: unread ? "var(--primary)" : "var(--muted)" }}
                          aria-label={unread ? "Mark as read" : "Mark as unread"}
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteOne(notification.id)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                          aria-label="Dismiss notification"
                        >
                          &#10005;
                        </button>
                      </div>
                    </div>
                    {notification.body && (
                      <div className="mt-1 rounded-xl bg-primary/5 px-3 py-2 text-xs text-foreground">
                        {notification.body}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
