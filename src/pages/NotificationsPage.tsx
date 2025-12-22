// src/pages/NotificationsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { Container } from "../components/layout/Container";
import { SectionHeader } from "../components/layout/SectionHeader";

export type Notification = {
  id: string;
  created_at: string;
  title?: string | null;
  body?: string | null;
  type?: string | null;
  is_read?: boolean | null;
  meta?: any | null;
};

const now = new Date();

// Mock data (used only if unauthenticated or blocked)
const mockNotifications: Notification[] = [
  {
    id: "mock-1",
    created_at: now.toISOString(),
    type: "Calendar",
    title: "Sarah shared her calendar with you",
    body: "Tap to view upcoming camps and classes.",
    is_read: false,
    meta: { icon: "📅" },
  },
  {
    id: "mock-2",
    created_at: now.toISOString(),
    type: "Message",
    title: "Camp Wildwood sent you a message",
    body:
      "We can’t wait to see you tomorrow. Please use the front entrance for check-in.",
    is_read: false,
    meta: { icon: "🏕️" },
  },
];

function formatRelativeTime(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr${diffHr > 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
}

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

type ItemProps = {
  notification: Notification;
  onDelete: (id: string) => void;
  onToggleRead: (id: string, nextIsRead: boolean) => void;
};

const NotificationItem: React.FC<ItemProps> = ({
  notification,
  onDelete,
  onToggleRead,
}) => {
  const { id, title, body, type, created_at, is_read, meta } = notification;
  const unread = !is_read;
  const icon = meta?.icon ?? "🔔";
  const tag = type ?? "Update";

  return (
    <article
      className={cx(
        "rounded-2xl border border-black/5 bg-white shadow-sm px-4 py-3 sm:px-5 sm:py-4",
        unread ? "bg-amber-50/40" : ""
      )}
    >
      <div className="flex gap-3">
        <div className="mt-1 text-xl shrink-0">{icon}</div>

        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 leading-snug">
                {title || "Notification"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {formatRelativeTime(created_at)}
                {tag ? <span> · {tag}</span> : null}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => onToggleRead(id, !!unread)}
                className="h-2.5 w-2.5 rounded-full mt-1"
                style={{
                  backgroundColor: unread ? "#ef4444" : "#d1d5db",
                }}
                aria-label={unread ? "Mark as read" : "Mark as unread"}
                title={unread ? "Mark as read" : "Mark as unread"}
              />
              <button
                type="button"
                onClick={() => onDelete(id)}
                className="text-xs text-gray-400 hover:text-gray-600"
                aria-label="Dismiss notification"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>

          {body ? (
            <div className="mt-1 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-gray-800">
              {body}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
};

type Filter = "all" | "unread";

export const NotificationsPage: React.FC = () => {
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
          console.warn("[Notifications] fallback to mock", error?.message);
          setItems(mockNotifications);
        } else {
          setItems(data as Notification[]);
        }
      } catch (err) {
        console.warn("[Notifications] unexpected error", err);
        setError("We couldn’t load notifications right now.");
        setItems(mockNotifications);
        setUserId(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.is_read).length,
    [items]
  );

  const filteredItems = useMemo(() => {
    if (filter === "unread") return items.filter((n) => !n.is_read);
    return items;
  }, [items, filter]);

  const handleDeleteOne = async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));

    if (!userId) return;

    await supabase.from("notifications").delete().eq("id", id).eq("user_id", userId);
  };

  const handleToggleRead = async (id: string, nextIsRead: boolean) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: nextIsRead } : n))
    );

    if (!userId) return;

    await supabase
      .from("notifications")
      .update({ is_read: nextIsRead })
      .eq("id", id)
      .eq("user_id", userId);
  };

  const handleDeleteAll = async () => {
    setItems([]);

    if (!userId) return;

    await supabase.from("notifications").delete().eq("user_id", userId);
  };

  const handleMarkAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));

    if (!userId) return;

    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId);
  };

  return (
    <main className="flex-1">
      <Container className="max-w-3xl py-8">
        {/* ✅ Standardized page header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <SectionHeader
            title="Notifications"
            subtitle="Updates about bookings, messages, and shared calendars."
          />

          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={items.length === 0}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Delete all
            </button>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={items.length === 0 || unreadCount === 0}
              className="rounded-md border border-gray-900 bg-gray-900 px-3 py-1.5 text-white hover:bg-black disabled:opacity-40"
            >
              Mark all as read
            </button>
          </div>
        </div>

        {/* ✅ Filter row */}
        <div className="mb-4 flex items-center gap-2">
          <label className="sr-only" htmlFor="notifFilter">
            Filter notifications
          </label>
          <select
            id="notifFilter"
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="h-9 rounded-xl border border-black/10 bg-white px-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
          </select>

          {unreadCount > 0 ? (
            <span className="text-xs text-gray-500">{unreadCount} unread</span>
          ) : (
            <span className="text-xs text-gray-500">All caught up</span>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-gray-600">Loading notifications…</p>
        ) : null}

        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

        <section className="space-y-3">
          {filteredItems.length === 0 && !loading ? (
            <p className="text-sm text-gray-600">
              {filter === "unread"
                ? "No unread notifications right now."
                : "You’re all caught up. No notifications right now."}
            </p>
          ) : (
            filteredItems.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onDelete={handleDeleteOne}
                onToggleRead={handleToggleRead}
              />
            ))
          )}
        </section>
      </Container>
    </main>
  );
};

export default NotificationsPage;
