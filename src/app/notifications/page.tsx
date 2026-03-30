"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ContentCard } from "@/components/ui/ContentCard";
import {
  NotificationItem,
  type NotificationData,
} from "@/components/notifications/NotificationItem";

/* ── Mock data ─────────────────────────────────────────── */

const _now = new Date().toISOString();

const mockNotifications: NotificationData[] = [
  {
    id: "mock-1",
    created_at: _now,
    type: "booking_confirmed",
    is_read: false,
    meta: {
      actorName: "Angela Rodriguez",
      campName: "Saddle and Grove Summer Camp",
      childName: "Liam (Scott) Rodriguez",
    },
  },
  {
    id: "mock-2",
    created_at: _now,
    type: "message",
    is_read: false,
    meta: {
      actorName: "Camp Wildwood",
      campName: "Camp Wildwood",
      conversationId: "mock-wildwood",
      messageBody:
        "We can't wait to see you tomorrow. Please use the front entrance for check-in. Also, it looks like it might be a hot one. Please pack sunscreen for your little one.",
    },
  },
  {
    id: "mock-3",
    created_at: _now,
    type: "booking_confirmed",
    is_read: true,
    meta: {
      actorName: "John Patel",
      campName: "STEM Robotics Week",
      childName: "Ava Patel",
    },
  },
  {
    id: "mock-4",
    created_at: _now,
    type: "booking_pending",
    is_read: false,
    meta: {
      actorName: "Rachel Kim",
      campName: "Cooking Adventures Camp",
      childName: "Noah Kim",
      bookingId: "booking-mock-4",
    },
  },
  {
    id: "mock-5",
    created_at: _now,
    type: "booking_canceled",
    is_read: true,
    meta: {
      actorName: "Emma Riley",
      campName: "Dance & Movement Camp",
      childName: "Sophie Riley",
    },
  },
  {
    id: "mock-6",
    created_at: _now,
    type: "camp_reminder",
    is_read: false,
    meta: {
      actorName: "Dance & Movement Camp",
      campName: "Dance & Movement Camp",
    },
  },
];

/* ── Filter type ───────────────────────────────────────── */

type Filter = "all" | "unread";

/* ── Page ──────────────────────────────────────────────── */

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  /* ── load ── */
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
        const { data, error: dbErr } = await supabase
          .from("notifications")
          .select("id, created_at, title, body, type, is_read, meta")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);
        if (dbErr || !data || data.length === 0) {
          // Fall back to mock data so the UI is always demonstrable
          setItems(mockNotifications);
        } else {
          setItems(data as NotificationData[]);
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

  /* ── realtime ── */
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-realtime-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setItems((prev) => [payload.new as NotificationData, ...prev]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  /* ── derived ── */
  const unreadCount = useMemo(
    () => items.filter((n) => !n.is_read).length,
    [items],
  );

  const filteredItems = useMemo(() => {
    if (filter === "unread") return items.filter((n) => !n.is_read);
    return items;
  }, [items, filter]);

  /* ── handlers ── */
  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    if (!userId) return;
    await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
  };

  const handleToggleRead = async (id: string, nextIsRead: boolean) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: nextIsRead } : n)),
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
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId);
  };

  const handleApprove = async (notifId: string, bookingId: string) => {
    // Optimistic: mark notification read and remove approve/decline UI
    setItems((prev) =>
      prev.map((n) =>
        n.id === notifId
          ? { ...n, is_read: true, type: "booking_confirmed" }
          : n,
      ),
    );
    if (!userId) return;
    await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", bookingId);
    await supabase
      .from("notifications")
      .update({ is_read: true, type: "booking_confirmed" })
      .eq("id", notifId)
      .eq("user_id", userId);
  };

  const handleDecline = async (notifId: string, bookingId: string) => {
    setItems((prev) =>
      prev.map((n) =>
        n.id === notifId
          ? { ...n, is_read: true, type: "booking_canceled" }
          : n,
      ),
    );
    if (!userId) return;
    await supabase
      .from("bookings")
      .update({ status: "declined" })
      .eq("id", bookingId);
    await supabase
      .from("notifications")
      .update({ is_read: true, type: "booking_canceled" })
      .eq("id", notifId)
      .eq("user_id", userId);
  };

  const handleReply = (notifId: string) => {
    const n = items.find((x) => x.id === notifId);
    const conversationId = n?.meta?.conversationId;
    const campId = n?.meta?.campId;
    if (conversationId) {
      router.push(`/messages?c=${encodeURIComponent(conversationId)}`);
    } else if (campId) {
      router.push(`/messages?camp=${campId}`);
    } else {
      router.push("/messages");
    }
  };

  const handleNavigate = (notifId: string) => {
    handleReply(notifId);
  };

  /* ── render ── */
  return (
    <main>
      <div className="page-container py-8 lg:py-10">
        <div className="page-grid">
          <div className="span-8-center">
            <ContentCard
              title="Notifications"
              bordered={false}
              bodyClassName="px-8 pb-8"
              actions={
                <>
                  <Button variant="outline" size="sm" onClick={handleDeleteAll} disabled={items.length === 0}>
                    Delete all
                  </Button>
                  <Button size="sm" onClick={handleMarkAllRead} disabled={items.length === 0 || unreadCount === 0}>
                    Mark all as read
                  </Button>
                </>
              }
            >
              {/* Filter row */}
              <div className="flex items-center justify-between gap-3 mt-4 mb-2">
                <div className="flex items-center gap-1">
                  {(["all", "unread"] as Filter[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        filter === f
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {f === "all" ? "All" : "Unread"}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                </span>
              </div>

              {/* Error */}
              {error && <p className="px-5 py-3 text-sm text-destructive">{error}</p>}

              {/* Loading skeleton */}
              {loading && (
                <div className="divide-y divide-border">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3 px-8 py-4">
                      <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                        <div className="h-2.5 w-1/3 rounded bg-muted animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty */}
              {!loading && filteredItems.length === 0 && (
                <p className="px-5 py-8 text-sm text-muted-foreground text-center">
                  {filter === "unread" ? "No unread notifications." : "You're all caught up."}
                </p>
              )}

              {/* Items */}
              {!loading && filteredItems.length > 0 && (
                <div className="divide-y divide-border">
                  {filteredItems.map((notif) => (
                    <NotificationItem
                      key={notif.id}
                      notification={notif}
                      onToggleRead={handleToggleRead}
                      onDelete={handleDelete}
                      onApprove={handleApprove}
                      onDecline={handleDecline}
                      onReply={handleReply}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
              )}
            </ContentCard>
          </div>
        </div>
      </div>
    </main>
  );
}
