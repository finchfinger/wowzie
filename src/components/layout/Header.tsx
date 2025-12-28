// src/components/layout/Header.tsx
import React, { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { Container } from "./Container";
import { Button } from "../ui/Button";
import { ProfileMenu } from "./ProfileMenu";
import { SearchInput } from "../search/SearchInput";

type HeaderProps = {
  user: User | null;
  onSignInClick?: () => void;
  onHostClick?: () => void;
};

export const Header: React.FC<HeaderProps> = ({
  user,
  onSignInClick,
  onHostClick,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = !!user;

  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

  const toggleProfile = () => setProfileOpen((prev) => !prev);
  const closeProfile = () => setProfileOpen(false);

  const openMobile = () => setMobileOpen(true);
  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    closeMobile();
    closeProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  // Uses your Button component so hover/focus behavior matches everywhere.
  // Gradient is the ONLY override (no other overrides).
  const HostBasecampButton = (
    <Button
      type="button"
      variant="ghost"
      onClick={onHostClick}
      className="bg-gradient-to-r from-[#0000FF] via-[#FF1CEE] to-[#FF0000] bg-clip-text text-transparent"
    >
      Host Basecamp
    </Button>
  );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-wowzie-borderSubtle bg-wowzie-surface/90 backdrop-blur">
        <Container className="h-16 flex items-center justify-between gap-3">
          {/* Left: Logo */}
          <NavLink to="/" className="flex items-center" aria-label="Go to homepage">
            <img src="/logo.svg" alt="Wowzie" className="h-8 w-auto" />
          </NavLink>

          {/* Center: Search (desktop) */}
          <div className="hidden md:flex flex-1 max-w-xl mx-4">
            <SearchInput value={query} onChange={setQuery} onSubmit={submitSearch} />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <nav className="hidden md:flex items-center gap-4 text-bodySm text-wowzie-text-muted">
                  <NavLink to="/activities" className="hover:text-wowzie-text-primary">
                    🌱 Activities
                  </NavLink>

                  <NavLink to="/calendars" className="hover:text-wowzie-text-primary">
                    📅 Calendars
                  </NavLink>

                  <NavLink to="/messages" className="hover:text-wowzie-text-primary">
                    💬 Messages
                    <span className="ml-1 h-1.5 w-1.5 inline-block rounded-full bg-red-500 align-middle" />
                  </NavLink>

                  <NavLink to="/notifications" className="hover:text-wowzie-text-primary">
                    🔔 Notifications
                    <span className="ml-1 h-1.5 w-1.5 inline-block rounded-full bg-red-500 align-middle" />
                  </NavLink>

                  {HostBasecampButton}
                </nav>

                <div className="relative hidden md:inline-flex">
                  <button
                    type="button"
                    onClick={toggleProfile}
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-wowzie-surfaceSubtle border border-wowzie-borderSubtle text-lg"
                    aria-label="Account menu"
                    aria-expanded={profileOpen}
                  >
                    🥺
                  </button>

                  {user && (
                    <ProfileMenu
                      user={user}
                      isOpen={profileOpen}
                      onClose={closeProfile}
                      variant="desktop"
                    />
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Logged-out: Host Basecamp (same route as host basecamp) */}
                <div className="hidden sm:inline-flex">{HostBasecampButton}</div>

                <Button
                  variant="subtle"
                  className="text-bodySm px-3 py-2 hidden sm:inline-flex"
                  onClick={onSignInClick}
                >
                  Sign in
                </Button>
              </>
            )}

            {/* Mobile search button */}
            <button
              type="button"
              onClick={() => navigate("/search")}
              className="inline-flex md:hidden items-center justify-center h-9 w-9 rounded-full border border-wowzie-borderSubtle bg-wowzie-surface"
              aria-label="Search"
            >
              🔍
            </button>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={openMobile}
              className="inline-flex md:hidden items-center justify-center h-9 w-9 rounded-full border border-wowzie-borderSubtle bg-wowzie-surface"
              aria-label="Menu"
              aria-expanded={mobileOpen}
            >
              ☰
            </button>
          </div>
        </Container>
      </header>

      {/* Mobile menus as siblings of header */}
      {isLoggedIn && user && (
        <ProfileMenu
          user={user}
          isOpen={mobileOpen}
          onClose={closeMobile}
          variant="mobile"
          hostDashboardPath="/host/dashboard"
        />
      )}

      {!isLoggedIn && mobileOpen && (
        <div className="fixed inset-0 z-[9999] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={closeMobile}
            aria-label="Close menu"
          />

          <div className="absolute right-0 top-0 h-full w-[86%] max-w-sm bg-white shadow-xl border-l border-wowzie-borderSubtle isolate">
            <div className="h-16 px-4 flex items-center justify-between border-b border-wowzie-borderSubtle">
              <span className="text-sm font-medium text-wowzie-text">Menu</span>
              <button
                type="button"
                onClick={closeMobile}
                className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-wowzie-borderSubtle bg-wowzie-surface"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onHostClick}
                className="w-full justify-start bg-gradient-to-r from-[#0000FF] via-[#FF1CEE] to-[#FF0000] bg-clip-text text-transparent"
              >
                Host Basecamp
              </Button>

              <button
                type="button"
                onClick={onSignInClick}
                className="w-full text-left rounded-xl bg-wowzie-text-primary px-4 py-3 text-sm font-medium text-white hover:bg-wowzie-text-primary/90"
              >
                Sign in
              </button>

              <nav className="pt-2 border-t border-wowzie-borderSubtle text-sm text-wowzie-text-subtle">
                <NavLink to="/help" onClick={closeMobile} className="block py-3">
                  Help Center
                </NavLink>
                <NavLink to="/privacy" onClick={closeMobile} className="block py-3">
                  Privacy policy
                </NavLink>
                <NavLink to="/terms" onClick={closeMobile} className="block py-3">
                  Terms
                </NavLink>
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
