"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { AuthModal } from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/button";

import {
  Heart,
  CalendarDays,
  Users,
  MessageSquare,
  Bell,
  UserCircle,
  Settings,
  HelpCircle,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function Header() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoggedIn = !!user;

  // Hide header search on homepage until hero is scrolled past
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isApprovedHost, setIsApprovedHost] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close menu on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    if (menuOpen) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [menuOpen]);

  // Load host status + current play session on login
  useEffect(() => {
    if (!user?.id) {
      setIsApprovedHost(false);
      setIsPlaying(false);
      return;
    }

    // Check host status
    supabase
      .from("host_profiles")
      .select("host_status")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setIsApprovedHost(data?.host_status === "approved");
      });

    // Check active play session
    supabase
      .from("play_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setIsPlaying(!!data);
      });
  }, [user?.id]);

  // Listen for play state changes dispatched by PlayingWidget
  useEffect(() => {
    const handler = (e: Event) => {
      setIsPlaying((e as CustomEvent<{ active: boolean }>).detail.active);
    };
    window.addEventListener("golly:play-changed", handler as EventListener);
    return () => window.removeEventListener("golly:play-changed", handler as EventListener);
  }, []);

  // Load unread message count + subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) { setUnreadCount(0); return; }

    const fetchUnread = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("unread_count")
        .eq("user_id", user.id);
      const total = (data ?? []).reduce((sum, c) => sum + (Number(c.unread_count) || 0), 0);
      setUnreadCount(total);
    };
    void fetchUnread();

    const channel = supabase
      .channel(`header-unread-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations", filter: `user_id=eq.${user.id}` },
        () => { void fetchUnread(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // Load unread notification count + subscribe to realtime
  useEffect(() => {
    if (!user?.id) { setUnreadNotifCount(0); return; }

    const fetchNotifUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setUnreadNotifCount(count ?? 0);
    };
    void fetchNotifUnread();

    const channel = supabase
      .channel(`header-notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => setUnreadNotifCount((n) => n + 1)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => { void fetchNotifUnread(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const handlePlayClick = () => {
    window.dispatchEvent(new CustomEvent("golly:toggle-play"));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.refresh();
  };

  const handleHostButton = () => {
    if (isLoggedIn) {
      router.push(isApprovedHost ? "/host/listings" : "/host");
    } else {
      setAuthOpen(true);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const menuItems: Array<{ label: string; href: string; icon: LucideIcon }> = [
    { label: "Wishlists", href: "/wishlist", icon: Heart },
    { label: "My Activities", href: "/activities", icon: CalendarDays },
    { label: "My Friends", href: "/friends", icon: Users },
    { label: "Messages", href: "/messages", icon: MessageSquare },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Profile", href: "/profile", icon: UserCircle },
    { label: "Settings", href: "/settings", icon: Settings },
    { label: "Help Center", href: "/help", icon: HelpCircle },
  ];

  const hostLabel = isApprovedHost ? "Host Dashboard" : "Become a Host";

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6">
          <div className="h-14 flex items-center justify-between gap-3">

            {/* Logo */}
            <Link href="/" className="flex items-center shrink-0" aria-label="Go to homepage">
              <span
                className="font-bold tracking-tight font-logo leading-none text-brand"
                style={{ fontSize: "38px" }}
              >
                golly
              </span>
            </Link>

            {/* Search — hidden on homepage until hero is scrolled past */}
            <form onSubmit={handleSearch} className={`hidden sm:flex flex-1 max-w-sm mx-4 transition-opacity duration-200 ${showHeaderSearch ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
              <div className="relative w-full">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="text-muted-foreground"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search camps and classes..."
                  className="h-8 w-full rounded-full border border-input bg-muted/40 pl-8 pr-4 text-sm text-foreground placeholder:text-muted-foreground hover:bg-muted/60 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/10 transition-all"
                />
              </div>
            </form>

            {/* Right side */}
            <div className="flex items-center gap-0.5 shrink-0">

              {isLoggedIn && (
                <>
                  {/* Playing indicator — 😊 when active, 😕 when not */}
                  <button
                    type="button"
                    onClick={handlePlayClick}
                    aria-label={isPlaying ? "You're playing — tap to manage" : "Not playing — tap to start"}
                    title={isPlaying ? "Playing" : "Not playing"}
                    className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-base leading-none"
                  >
                    {isPlaying ? "😊" : "😕"}
                  </button>

                  {/* AI Chat */}
                  <Link
                    href="/ai-chat"
                    className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
                    aria-label="AI Chat"
                    title="AI Chat"
                  >
                    {/* Robot icon */}
                    <svg
                      width="17" height="17" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <rect x="3" y="8" width="18" height="12" rx="3" />
                      <circle cx="9" cy="14" r="1.5" fill="currentColor" stroke="none" />
                      <circle cx="15" cy="14" r="1.5" fill="currentColor" stroke="none" />
                      <line x1="12" y1="8" x2="12" y2="4" />
                      <circle cx="12" cy="3" r="1" fill="currentColor" stroke="none" />
                    </svg>
                  </Link>

                  {/* Bell — notifications */}
                  <Link
                    href="/notifications"
                    className="relative h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
                    aria-label="Notifications"
                    title="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadNotifCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-background" />
                    )}
                  </Link>
                </>
              )}

              {/* Host button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleHostButton}
                className="hidden md:inline-flex ml-1"
              >
                {isLoggedIn ? hostLabel : "Become a Host"}
              </Button>

              {isLoggedIn ? (
                <>
                  {/* Profile avatar — prefer first name initial, fall back to email */}
                  <Link
                    href="/profile"
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity ml-1.5"
                    aria-label="View profile"
                  >
                    {(
                      (user?.user_metadata?.first_name as string | undefined)?.charAt(0) ||
                      user?.email?.charAt(0) ||
                      "U"
                    ).toUpperCase()}
                  </Link>

                  {/* Menu button */}
                  <div className="relative ml-0.5">
                    <button
                      type="button"
                      onClick={() => setMenuOpen((prev) => !prev)}
                      className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                      aria-label="Menu"
                      aria-expanded={menuOpen}
                    >
                      <svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="text-foreground"
                      >
                        <line x1="4" y1="6" x2="20" y2="6" />
                        <line x1="4" y1="12" x2="20" y2="12" />
                        <line x1="4" y1="18" x2="20" y2="18" />
                      </svg>
                      {/* Unread badge dot — messages or notifications */}
                      {(unreadCount > 0 || unreadNotifCount > 0) && (
                        <span className="absolute top-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-background" />
                      )}
                    </button>

                    {/* Dropdown menu */}
                    {menuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />

                        <div className="absolute right-0 top-11 z-50 w-60 rounded-2xl bg-card shadow-xl border border-border/40 overflow-hidden">
                          {/* User info */}
                          <div className="px-4 py-3 border-b border-border/50">
                            {user?.user_metadata?.first_name && (
                              <p className="text-sm font-semibold text-foreground truncate">
                                {user.user_metadata.first_name as string}
                                {user.user_metadata.last_name
                                  ? ` ${user.user_metadata.last_name as string}`
                                  : ""}
                              </p>
                            )}
                            <p className={`truncate ${user?.user_metadata?.first_name ? "text-xs text-muted-foreground" : "text-sm font-medium text-foreground"}`}>
                              {user?.email}
                            </p>
                          </div>

                          {/* Mobile-only search */}
                          <div className="sm:hidden px-3 pt-2 pb-2 border-b border-border/50">
                            <form onSubmit={(e) => { handleSearch(e); setMenuOpen(false); }}>
                              <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                className="h-9 w-full rounded-lg border border-input bg-transparent pl-3 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30 transition-colors"
                              />
                            </form>
                          </div>

                          {/* Nav links */}
                          <nav className="py-1.5">
                            {/* Mobile-only: Host button */}
                            <div className="md:hidden">
                              <button
                                type="button"
                                onClick={() => { handleHostButton(); setMenuOpen(false); }}
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                                {hostLabel}
                              </button>
                            </div>

                            {menuItems.map((item) => {
                              const Icon = item.icon;
                              const isActive = pathname === item.href;
                              const badge =
                                item.href === "/messages" && unreadCount > 0
                                  ? unreadCount
                                  : item.href === "/notifications" && unreadNotifCount > 0
                                  ? unreadNotifCount
                                  : 0;
                              return (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  onClick={() => setMenuOpen(false)}
                                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted ${
                                    isActive ? "text-foreground font-medium" : "text-foreground"
                                  }`}
                                >
                                  <Icon
                                    className={`h-4 w-4 ${
                                      isActive ? "text-foreground" : "text-muted-foreground"
                                    }`}
                                  />
                                  {item.label}
                                  {badge > 0 && (
                                    <span className="ml-auto h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-semibold">
                                      {badge > 99 ? "99+" : badge}
                                    </span>
                                  )}
                                </Link>
                              );
                            })}
                          </nav>

                          {/* Sign out */}
                          <div className="border-t border-border/50 py-1.5">
                            <button
                              type="button"
                              onClick={handleSignOut}
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                            >
                              <LogOut className="h-4 w-4 text-muted-foreground" />
                              Log out
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                /* Signed out */
                <div className="flex items-center ml-1">
                  <Button size="sm" onClick={() => setAuthOpen(true)}>
                    Sign in
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
      />
    </>
  );
}
