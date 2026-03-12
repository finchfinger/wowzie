"use client";

import { useState } from "react";
import Link from "next/link";
import { WowziLogo } from "@/components/ui/WowziLogo";
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

/* ── Types ──────────────────────────────────────────── */

export interface HeaderBarProps {
  /** Is a user logged in? */
  isLoggedIn?: boolean;
  /** Full display name, e.g. "Jane Smith" */
  userName?: string;
  /** Email for dropdown header */
  userEmail?: string;
  /** Profile photo URL — omit for initials fallback */
  avatarUrl?: string | null;

  /** Host status controls button label + menu visibility */
  isApprovedHost?: boolean;

  /** Play toggle state */
  isPlaying?: boolean;
  onPlayToggle?: () => void;

  /** Show/hide the search bar (hidden on homepage before scroll) */
  showHeaderSearch?: boolean;

  /** Unread badge counts */
  unreadCount?: number;
  unreadNotifCount?: number;

  /** Callbacks — all optional; no-ops by default */
  onSignInClick?: () => void;
  onHostClick?: () => void;
  onSignOut?: () => void;
  onAIChatClick?: () => void;
  onSearchSubmit?: (query: string) => void;

  /** Highlight the active menu item */
  activePath?: string;
}

/* ── Menu items ─────────────────────────────────────── */

const MENU_ITEMS: Array<{ label: string; href: string; icon: LucideIcon }> = [
  { label: "Wishlists", href: "/wishlist", icon: Heart },
  { label: "My Activities", href: "/activities", icon: CalendarDays },
  { label: "My Friends", href: "/friends", icon: Users },
  { label: "Messages", href: "/messages", icon: MessageSquare },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Profile", href: "/profile", icon: UserCircle },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help Center", href: "/help", icon: HelpCircle },
];

/* ── Component ──────────────────────────────────────── */

/* ── Shared icon-button class (48 × 48 px) ──────────── */
const iconBtn =
  "h-12 w-12 flex items-center justify-center rounded-full hover:bg-muted transition-colors shrink-0";

export function HeaderBar({
  isLoggedIn = false,
  userName,
  userEmail,
  avatarUrl,
  isApprovedHost = false,
  isPlaying = false,
  showHeaderSearch = true,
  unreadCount = 0,
  unreadNotifCount = 0,
  onPlayToggle,
  onSignInClick,
  onHostClick,
  onSignOut,
  onAIChatClick,
  onSearchSubmit,
  activePath = "",
}: HeaderBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const hostLabel = isApprovedHost ? "Host Basecamp" : "Become a Host";
  const userInitial = (userName?.charAt(0) ?? userEmail?.charAt(0) ?? "U").toUpperCase();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) onSearchSubmit?.(q);
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6">
        <div className="py-3 flex items-center justify-between gap-2">

          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0" aria-label="Go to homepage">
            <WowziLogo size={40} />
          </Link>

          {/* Search — Material 3 style, stretches to fill */}
          <form
            onSubmit={handleSearch}
            className={`hidden sm:flex flex-1 mx-3 transition-opacity duration-200 ${
              showHeaderSearch ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="relative w-full flex items-center h-12 rounded-full bg-muted/70 shadow-sm hover:shadow-md focus-within:shadow-md focus-within:bg-muted/90 transition-all">
              <div className="pointer-events-none absolute left-4 flex items-center">
                <svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none"
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
                className="h-full w-full rounded-full bg-transparent pl-11 pr-5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </form>

          {/* Right side */}
          <div className="flex items-center gap-0.5 shrink-0">

            {isLoggedIn && (
              <>
                {/* Playing toggle icon button */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPlaying}
                  onClick={onPlayToggle}
                  aria-label={isPlaying ? "Playing — tap to stop" : "Not playing — tap to start"}
                  title={isPlaying ? "Playing" : "Not playing"}
                  className={`${iconBtn} transition-colors ${
                    isPlaying ? "text-green-500" : "text-muted-foreground"
                  }`}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: "26px" }}>
                    {isPlaying ? "toggle_on" : "toggle_off"}
                  </span>
                </button>

                {/* AI Chat */}
                <button
                  type="button"
                  onClick={onAIChatClick}
                  className={`${iconBtn} text-muted-foreground`}
                  aria-label="AI Chat"
                  title="AI Chat"
                >
                  <span className="material-symbols-rounded" style={{ fontSize: "24px" }}>smart_toy</span>
                </button>
              </>
            )}

            {/* Host button — desktop only for non-approved hosts */}
            {!isApprovedHost && (
              <Button
                variant="outline"
                onClick={onHostClick}
                className="hidden md:inline-flex h-12 px-5 ml-1"
              >
                Become a Host
              </Button>
            )}

            {isLoggedIn ? (
              <>
                {/* Profile avatar — 48 × 48 */}
                <Link
                  href="/profile"
                  className="h-12 w-12 rounded-full overflow-hidden flex items-center justify-center bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity ml-1 shrink-0"
                  aria-label="View profile"
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                </Link>

                {/* Menu button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((p) => !p)}
                    className={iconBtn}
                    aria-label="Menu"
                    aria-expanded={menuOpen}
                  >
                    {/* 3×3 grid dots */}
                    <svg width="16" height="16" viewBox="0 0 15 15" fill="currentColor" className="text-foreground">
                      <circle cx="2.5" cy="2.5" r="1.5" />
                      <circle cx="7.5" cy="2.5" r="1.5" />
                      <circle cx="12.5" cy="2.5" r="1.5" />
                      <circle cx="2.5" cy="7.5" r="1.5" />
                      <circle cx="7.5" cy="7.5" r="1.5" />
                      <circle cx="12.5" cy="7.5" r="1.5" />
                      <circle cx="2.5" cy="12.5" r="1.5" />
                      <circle cx="7.5" cy="12.5" r="1.5" />
                      <circle cx="12.5" cy="12.5" r="1.5" />
                    </svg>
                    {(unreadCount > 0 || unreadNotifCount > 0) && (
                      <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-background" />
                    )}
                  </button>

                  {/* Dropdown */}
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 top-14 z-50 w-60 rounded-2xl bg-card shadow-xl border border-border/40 overflow-hidden">

                        {/* User info */}
                        <div className="px-4 py-3 border-b border-border/50">
                          {userName && (
                            <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                          )}
                          {userEmail && (
                            <p className={`truncate ${userName ? "text-xs text-muted-foreground" : "text-sm font-medium text-foreground"}`}>
                              {userEmail}
                            </p>
                          )}
                        </div>

                        {/* Nav links */}
                        <nav className="py-1.5">
                          <div className={isApprovedHost ? "" : "md:hidden"}>
                            <button
                              type="button"
                              onClick={() => { onHostClick?.(); setMenuOpen(false); }}
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                            >
                              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                              {hostLabel}
                            </button>
                          </div>

                          {MENU_ITEMS.map((item) => {
                            const Icon = item.icon;
                            const isActive = activePath === item.href;
                            const badge =
                              item.href === "/messages" && unreadCount > 0 ? unreadCount
                              : item.href === "/notifications" && unreadNotifCount > 0 ? unreadNotifCount
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
                                <Icon className={`h-4 w-4 ${isActive ? "text-foreground" : "text-muted-foreground"}`} />
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
                            onClick={() => { onSignOut?.(); setMenuOpen(false); }}
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
              <div className="flex items-center ml-1">
                <Button className="h-12 px-5" onClick={onSignInClick}>
                  Sign in
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
