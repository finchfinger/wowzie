"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { WowziLogo } from "@/components/ui/WowziLogo";
import { Button } from "@/components/ui/button";

/* ── Material icon helper ───────────────────────────── */
function MI({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <span
      className="material-symbols-rounded select-none"
      style={{ fontSize: size, lineHeight: 1 }}
    >
      {name}
    </span>
  );
}

/* ── Ask Scout gradient-border pill ────────────────── */
function AskScoutButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hidden md:inline-flex shrink-0 w-fit"
      aria-label="Ask Scout"
    >
      {/* gradient border wrapper */}
      <span
        className="p-[1.5px] rounded-full"
        style={{ background: "linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #3b82f6 100%)" }}
      >
        <span className="flex items-center gap-1.5 px-4 h-10 rounded-full bg-background text-sm font-medium text-foreground whitespace-nowrap hover:bg-muted/60 transition-colors">
          <span
            className="material-symbols-rounded select-none text-foreground"
            style={{ fontSize: 18, lineHeight: 1 }}
          >
            explore
          </span>
          Ask Scout
        </span>
      </span>
    </button>
  );
}

/* ── Types ──────────────────────────────────────────── */

export interface HeaderBarProps {
  isLoggedIn?: boolean;
  userName?: string;
  userEmail?: string;
  avatarUrl?: string | null;
  isApprovedHost?: boolean;
  isPlaying?: boolean;
  onPlayToggle?: () => void;
  showHeaderSearch?: boolean;
  unreadCount?: number;
  unreadNotifCount?: number;
  onScoutClick?: () => void;
  onSignInClick?: () => void;
  onHostClick?: () => void;
  onSignOut?: () => void;
  onSearchSubmit?: (query: string) => void;
  activePath?: string;
}

/* ── Menu items ─────────────────────────────────────── */

const NAV_ITEMS: Array<{ label: string; href: string; icon: string }> = [
  { label: "Wishlists",     href: "/wishlist",      icon: "favorite" },
  { label: "Activities",    href: "/activities",    icon: "camping" },
  { label: "Friends",       href: "/friends",       icon: "diversity_2" },
  { label: "Messages",      href: "/messages",      icon: "tooltip" },
  { label: "Notifications", href: "/notifications", icon: "notifications" },
  { label: "Profile",       href: "/profile",       icon: "account_circle" },
];

const ACCOUNT_ITEMS: Array<{ label: string; href: string; icon: string }> = [
  { label: "Settings",    href: "/settings", icon: "settings" },
  { label: "Help Center", href: "/help",     icon: "help" },
];

/* ── Dots icon (9-dot grid) ─────────────────────────── */
function DotsGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
      <circle cx="3"  cy="3"  r="1.6" />
      <circle cx="9"  cy="3"  r="1.6" />
      <circle cx="15" cy="3"  r="1.6" />
      <circle cx="3"  cy="9"  r="1.6" />
      <circle cx="9"  cy="9"  r="1.6" />
      <circle cx="15" cy="9"  r="1.6" />
      <circle cx="3"  cy="15" r="1.6" />
      <circle cx="9"  cy="15" r="1.6" />
      <circle cx="15" cy="15" r="1.6" />
    </svg>
  );
}

/* ── Search icon ────────────────────────────────────── */
function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

/* ── Component ──────────────────────────────────────── */

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
  onScoutClick,
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
      <div className="header-container">
        <div className="py-3 grid grid-cols-[auto_1fr_auto] items-center gap-2">

          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0" aria-label="Go to homepage">
            <WowziLogo size={40} />
          </Link>

          {/* Search bar — desktop only, fades when hidden on homepage */}
          <form
            onSubmit={handleSearch}
            className={`hidden sm:flex flex-1 mx-3 transition-opacity duration-200 ${
              showHeaderSearch ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="relative w-full flex items-center h-11 rounded-full bg-white transition-colors">
              <div className="pointer-events-none absolute left-4 flex items-center text-muted-foreground">
                <SearchIcon />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by camp name, topic, or location"
                className="h-full w-full rounded-full bg-transparent pl-12 pr-5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </form>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Playing status — FEATURE FLAG */}
            {isLoggedIn && process.env.NEXT_PUBLIC_ENABLE_PLAYING === "true" && (
              <Button
                variant="outline"
                role="switch"
                aria-checked={isPlaying}
                onClick={onPlayToggle}
                aria-label={isPlaying ? "Playing — tap to stop" : "Not playing — tap to start"}
                className={`hidden md:inline-flex h-11 px-4 gap-2 rounded-full ${isPlaying ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100" : ""}`}
              >
                <span className={`h-2 w-2 rounded-full shrink-0 ${isPlaying ? "bg-green-500" : "bg-red-500"}`} />
                {isPlaying ? "Playing" : "Not Playing"}
              </Button>
            )}

            {/* Ask Scout — only when logged in */}
            {isLoggedIn && <AskScoutButton onClick={onScoutClick} />}

            {/* Host button — desktop only */}
            {isApprovedHost ? (
              <Button
                onClick={onHostClick}
                className="hidden md:inline-flex h-11 px-5 rounded-full"
              >
                Host Basecamp
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={onHostClick}
                className="hidden md:inline-flex h-11 px-5 rounded-full border-foreground text-foreground"
              >
                Become a Host
              </Button>
            )}

            {isLoggedIn ? (
              <>
                {/* Mobile search icon */}
                <button
                  type="button"
                  onClick={() => onSearchSubmit?.("")}
                  className="sm:hidden h-11 w-11 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-foreground"
                  aria-label="Search"
                >
                  <SearchIcon />
                </button>

                {/* Profile avatar — desktop only */}
                <Link
                  href="/profile"
                  className="hidden sm:flex relative h-10 w-10 rounded-full overflow-hidden items-center justify-center bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity shrink-0"
                  aria-label="View profile"
                >
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="Profile" fill sizes="40px" className="object-cover" />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                </Link>

                {/* 9-dot menu button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((p) => !p)}
                    className="h-11 w-11 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-foreground shrink-0"
                    aria-label="Menu"
                    aria-expanded={menuOpen}
                  >
                    <DotsGrid />
                    {(unreadCount > 0 || unreadNotifCount > 0) && (
                      <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-background" />
                    )}
                  </button>

                  {/* Dropdown */}
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 top-14 z-50 w-64 rounded-card bg-card shadow-xl overflow-hidden">

                        {/* User info */}
                        <div className="px-4 py-3 border-b border-border/40">
                          {userName && (
                            <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                          )}
                        </div>

                        {/* Main nav */}
                        <nav className="py-1">
                          {NAV_ITEMS.map((item) => {
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
                                className={`flex items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/70 ${
                                  isActive ? "bg-muted font-medium" : ""
                                }`}
                              >
                                <span className="text-muted-foreground">
                                  <MI name={item.icon} />
                                </span>
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

                        {/* Account items */}
                        <div className="border-t border-border/40 py-1">
                          {ACCOUNT_ITEMS.map((item) => {
                            const isActive = activePath === item.href;
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/70 ${
                                  isActive ? "bg-muted font-medium" : ""
                                }`}
                              >
                                <span className="text-muted-foreground">
                                  <MI name={item.icon} />
                                </span>
                                {item.label}
                              </Link>
                            );
                          })}
                        </div>

                        {/* Host */}
                        <div className="border-t border-border/40 py-1">
                          <button
                            type="button"
                            onClick={() => { onHostClick?.(); setMenuOpen(false); }}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/70 transition-colors"
                          >
                            <span className="text-muted-foreground">
                              <MI name="mood" />
                            </span>
                            {hostLabel}
                          </button>
                        </div>

                        {/* Sign out */}
                        <div className="border-t border-border/40 py-1">
                          <button
                            type="button"
                            onClick={() => { onSignOut?.(); setMenuOpen(false); }}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/70 transition-colors"
                          >
                            <span className="text-muted-foreground">
                              <MI name="waving_hand" />
                            </span>
                            Log Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              /* Signed out — mobile: just dots grid, desktop: Become a Host + Sign In */
              <>
                {/* Mobile: dots grid opens sign-in */}
                <button
                  type="button"
                  onClick={onSignInClick}
                  className="sm:hidden h-11 w-11 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-foreground"
                  aria-label="Menu"
                >
                  <DotsGrid />
                </button>

                {/* Desktop Sign In */}
                <Button
                  className="hidden sm:inline-flex h-11 px-5 rounded-full bg-foreground text-background hover:bg-foreground/90"
                  onClick={onSignInClick}
                >
                  Sign In
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
