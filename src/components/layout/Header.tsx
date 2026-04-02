"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { AuthModal } from "@/components/auth/AuthModal";
import { HeaderBar } from "./HeaderBar";

export function Header() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoggedIn = !!user;

  // Hide search on homepage until hero is scrolled past
  const isHomepage = pathname === "/";
  const [heroPassed, setHeroPassed] = useState(false);
  useEffect(() => {
    if (!isHomepage) return;
    setHeroPassed(false);
    const onScroll = () => setHeroPassed(window.scrollY > 320);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHomepage]);
  const showHeaderSearch = !isHomepage || heroPassed;

  const [authOpen, setAuthOpen] = useState(false);
  const [isApprovedHost, setIsApprovedHost] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const shownInviteIds = useRef(new Set<string>());

  // Load avatar
  useEffect(() => {
    if (!user?.id) { setAvatarUrl(null); return; }
    supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle()
      .then(({ data }) => setAvatarUrl((data as any)?.avatar_url ?? null));
  }, [user?.id]);

  // Load host status + play session
  useEffect(() => {
    if (!user?.id) { setIsApprovedHost(false); setIsPlaying(false); return; }
    supabase.from("host_profiles").select("host_status").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setIsApprovedHost(data?.host_status === "approved"));
    supabase.from("play_sessions").select("id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle()
      .then(({ data }) => setIsPlaying(!!data));
  }, [user?.id]);

  // Play state changes from PlayingWidget
  useEffect(() => {
    const handler = (e: Event) => setIsPlaying((e as CustomEvent<{ active: boolean }>).detail.active);
    window.addEventListener("wowzi:play-changed", handler as EventListener);
    return () => window.removeEventListener("wowzi:play-changed", handler as EventListener);
  }, []);

  // Unread messages
  useEffect(() => {
    if (!user?.id) { setUnreadCount(0); return; }
    const fetchUnread = async () => {
      const { data } = await supabase.from("conversations").select("unread_count").eq("user_id", user.id);
      setUnreadCount((data ?? []).reduce((sum, c) => sum + (Number(c.unread_count) || 0), 0));
    };
    void fetchUnread();
    const channel = supabase.channel(`header-unread-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations", filter: `user_id=eq.${user.id}` }, () => { void fetchUnread(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // Unread notifications + invite toasts
  useEffect(() => {
    if (!user?.id) { setUnreadNotifCount(0); return; }
    shownInviteIds.current.clear();

    const fetchNotifUnread = async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false);
      setUnreadNotifCount(count ?? 0);
    };

    const showInviteToast = (notif: { id: string; title: string; body: string; meta: Record<string, unknown> | null }) => {
      if (shownInviteIds.current.has(notif.id)) return;
      shownInviteIds.current.add(notif.id);
      const shareUrl = (notif.meta?.share_url as string) ?? null;
      toast.info(notif.title, {
        description: notif.body,
        duration: 12000,
        action: shareUrl ? {
          label: "View invite",
          onClick: () => { void supabase.from("notifications").update({ is_read: true }).eq("id", notif.id); router.push(shareUrl); },
        } : undefined,
        onDismiss: () => { void supabase.from("notifications").update({ is_read: true }).eq("id", notif.id); },
      });
    };

    const fetchPendingInvite = async () => {
      const { data } = await supabase.from("notifications").select("id, title, body, meta").eq("user_id", user.id).eq("type", "calendar_share_invite").eq("is_read", false).limit(1).maybeSingle();
      if (data) showInviteToast({ id: data.id as string, title: data.title as string, body: data.body as string, meta: data.meta as Record<string, unknown> | null });
    };

    void fetchNotifUnread();
    void fetchPendingInvite();

    const channel = supabase.channel(`header-notif-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        setUnreadNotifCount((n) => n + 1);
        const notif = payload.new as Record<string, unknown>;
        if (notif?.type === "calendar_share_invite") {
          showInviteToast({ id: notif.id as string, title: (notif.title as string) || "Calendar invite", body: (notif.body as string) || "Someone shared their calendar with you.", meta: notif.meta as Record<string, unknown> | null });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => { void fetchNotifUnread(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, router]);

  const userName = [
    user?.user_metadata?.first_name as string | undefined,
    user?.user_metadata?.last_name as string | undefined,
  ].filter(Boolean).join(" ") || undefined;

  return (
    <>
      <HeaderBar
        isLoggedIn={isLoggedIn}
        userName={userName}
        userEmail={user?.email}
        avatarUrl={avatarUrl}
        isApprovedHost={isApprovedHost}
        // FEATURE FLAG: set NEXT_PUBLIC_ENABLE_PLAYING=true to re-enable
        isPlaying={process.env.NEXT_PUBLIC_ENABLE_PLAYING === "true" ? isPlaying : undefined}
        showHeaderSearch={showHeaderSearch}
        unreadCount={unreadCount}
        unreadNotifCount={unreadNotifCount}
        activePath={pathname}
        onPlayToggle={() => window.dispatchEvent(new CustomEvent("wowzi:toggle-play"))}
        onSignInClick={() => setAuthOpen(true)}
        onHostClick={() => {
          if (isLoggedIn) { router.push(isApprovedHost ? "/host/listings" : "/host"); }
          else { setAuthOpen(true); }
        }}
        onSignOut={async () => { await supabase.auth.signOut(); router.refresh(); }}
        onSearchSubmit={(q) => router.push(`/search?q=${encodeURIComponent(q)}`)}
      />

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
