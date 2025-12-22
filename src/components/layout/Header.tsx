import React, { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";

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
  const isLoggedIn = !!user;

  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState("");

  const toggleProfile = () => setProfileOpen((prev) => !prev);
  const closeProfile = () => setProfileOpen(false);

  const submitSearch = () => {
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-wowzie-borderSubtle bg-wowzie-surface/90 backdrop-blur">
      <Container className="h-16 flex items-center justify-between gap-3">
        {/* Left: Logo */}
        <a href="/" className="flex items-center">
          <img
            src="/logo.svg"   // put logo.svg in /public
            alt="Wowzie"
            className="h-8 w-auto"
          />
        </a>

        {/* Center: Search */}
        <div className="hidden md:flex flex-1 max-w-xl mx-4">
          <SearchInput
            value={query}
            onChange={setQuery}
            onSubmit={submitSearch}
          />
        </div>

        {/* Right: Navigation */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              {/* Desktop nav */}
              <nav className="hidden md:flex items-center gap-4 text-bodySm text-wowzie-text-muted">
                <a href="/activities" className="hover:text-wowzie-text-primary">
                  🌱 Activities
                </a>

                <a href="/calendars" className="hover:text-wowzie-text-primary">
                  📅 Calendars
                </a>

                <a href="/messages" className="hover:text-wowzie-text-primary">
                  💬 Messages
                  <span className="ml-1 h-1.5 w-1.5 inline-block rounded-full bg-red-500 align-middle" />
                </a>

                <a
                  href="/notifications"
                  className="hover:text-wowzie-text-primary"
                >
                  🔔 Notifications
                  <span className="ml-1 h-1.5 w-1.5 inline-block rounded-full bg-red-500 align-middle" />
                </a>

                <button
                  type="button"
                  onClick={onHostClick}
                  className="text-wowzie-accent-primary hover:text-wowzie-accent-primary/90"
                >
                  Host Basecamp
                </button>
              </nav>

              {/* Avatar */}
              <div className="relative hidden md:inline-flex">
                <button
                  type="button"
                  onClick={toggleProfile}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-wowzie-surfaceSubtle border border-wowzie-borderSubtle text-lg"
                  aria-label="Account menu"
                >
                  🥺
                </button>
                {user && (
                  <ProfileMenu
                    user={user}
                    isOpen={profileOpen}
                    onClose={closeProfile}
                  />
                )}
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onHostClick}
                className="hidden sm:inline-flex text-bodySm text-wowzie-text-muted hover:text-wowzie-text-primary"
              >
                Host Basecamp
              </button>

              <Button
                variant="subtle"
                className="text-bodySm px-3 py-2 hidden sm:inline-flex"
                onClick={onSignInClick}
              >
                Sign in
              </Button>
            </>
          )}

          {/* Mobile menu button */}
          <button
            type="button"
            className="inline-flex sm:hidden items-center justify-center h-9 w-9 rounded-full border border-wowzie-borderSubtle bg-wowzie-surface"
          >
            ☰
          </button>
        </div>
      </Container>
    </header>
  );
};
