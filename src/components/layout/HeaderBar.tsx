"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
            <div className="relative w-full flex items-center h-12 rounded-full bg-white transition-colors">
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
          <div className="flex items-center gap-3 shrink-0">

            {isLoggedIn && (
              <>
                {/* Playing status — desktop only, uses Button so corners match */}
                <Button
                  variant="outline"
                  role="switch"
                  aria-checked={isPlaying}
                  onClick={onPlayToggle}
                  aria-label={isPlaying ? "Playing — tap to stop" : "Not playing — tap to start"}
                  className={`hidden md:inline-flex h-12 px-4 gap-2 ${isPlaying ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100" : ""}`}
                >
                  <span className={`h-2 w-2 rounded-full shrink-0 ${isPlaying ? "bg-green-500" : "bg-red-500"}`} />
                  {isPlaying ? "Playing" : "Not Playing"}
                </Button>

                {/* AI Chat — robot_2 with light purple bg */}
                <Link
                  href="/ai-chat"
                  aria-label="AI Chat"
                  title="AI Chat"
                  className="h-12 w-12 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors shrink-0"
                >
                  <svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <mask id="robot-mask" style={{ maskType: "alpha" as const }} maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">
                      <rect width="20" height="20" fill="#D9D9D9"/>
                    </mask>
                    <g mask="url(#robot-mask)">
                      <path d="M4.16667 17.5C3.70833 17.5 3.31597 17.3368 2.98958 17.0104C2.66319 16.684 2.5 16.2917 2.5 15.8333V7.5C2.5 6.11111 2.98611 4.93056 3.95833 3.95833C4.93056 2.98611 6.11111 2.5 7.5 2.5H12.5C13.8889 2.5 15.0694 2.98611 16.0417 3.95833C17.0139 4.93056 17.5 6.11111 17.5 7.5V15.8333C17.5 16.2917 17.3368 16.684 17.0104 17.0104C16.684 17.3368 16.2917 17.5 15.8333 17.5H4.16667ZM4.16667 15.8333H15.8333V7.5C15.8333 6.58333 15.5069 5.79861 14.8542 5.14583C14.2014 4.49306 13.4167 4.16667 12.5 4.16667H7.5C6.58333 4.16667 5.79861 4.49306 5.14583 5.14583C4.49306 5.79861 4.16667 6.58333 4.16667 7.5V15.8333ZM6.32292 9.51042C5.99653 9.18403 5.83333 8.79167 5.83333 8.33333C5.83333 7.875 5.99653 7.48264 6.32292 7.15625C6.64931 6.82986 7.04167 6.66667 7.5 6.66667C7.95833 6.66667 8.35069 6.82986 8.67708 7.15625C9.00347 7.48264 9.16667 7.875 9.16667 8.33333C9.16667 8.79167 9.00347 9.18403 8.67708 9.51042C8.35069 9.83681 7.95833 10 7.5 10C7.04167 10 6.64931 9.83681 6.32292 9.51042ZM11.3229 9.51042C10.9965 9.18403 10.8333 8.79167 10.8333 8.33333C10.8333 7.875 10.9965 7.48264 11.3229 7.15625C11.6493 6.82986 12.0417 6.66667 12.5 6.66667C12.9583 6.66667 13.3507 6.82986 13.6771 7.15625C14.0035 7.48264 14.1667 7.875 14.1667 8.33333C14.1667 8.79167 14.0035 9.18403 13.6771 9.51042C13.3507 9.83681 12.9583 10 12.5 10C12.0417 10 11.6493 9.83681 11.3229 9.51042ZM5.83333 15.8333V14.1667C5.83333 13.7083 5.99653 13.316 6.32292 12.9896C6.64931 12.6632 7.04167 12.5 7.5 12.5H12.5C12.9583 12.5 13.3507 12.6632 13.6771 12.9896C14.0035 13.316 14.1667 13.7083 14.1667 14.1667V15.8333H12.5V14.1667H10.8333V15.8333H9.16667V14.1667H7.5V15.8333H5.83333Z" fill="currentColor"/>
                    </g>
                  </svg>
                </Link>
              </>
            )}

            {/* Host button — desktop only */}
            {isApprovedHost ? (
              <Button
                onClick={onHostClick}
                className="hidden md:inline-flex h-12 px-5"
              >
                Host Basecamp
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={onHostClick}
                className="hidden md:inline-flex h-12 px-5"
              >
                Become a Host
              </Button>
            )}

            {isLoggedIn ? (
              <>
                {/* Profile avatar — 48 × 48 */}
                <Link
                  href="/profile"
                  className="relative h-12 w-12 rounded-full overflow-hidden flex items-center justify-center bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity ml-1 shrink-0"
                  aria-label="View profile"
                >
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="Profile" fill sizes="48px" className="object-cover" />
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
                          <div className="md:hidden">
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
