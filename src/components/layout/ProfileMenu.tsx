import React, { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { NavLink } from "react-router-dom";

type Variant = "desktop" | "mobile";

type ProfileMenuProps = {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  variant?: Variant;
  hostDashboardPath?: string;
};

const linkBase =
  "block w-full text-left hover:bg-gray-50";

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  user,
  isOpen,
  onClose,
  variant = "desktop",
  hostDashboardPath = "/host/dashboard",
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (variant !== "desktop") return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, variant]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const meta = (user.user_metadata || {}) as Record<string, any>;
  const nameFromMeta =
    [meta.first_name, meta.last_name].filter(Boolean).join(" ") || meta.full_name;

  const displayName = nameFromMeta || user.email?.split("@")[0] || "Your account";
  const email = user.email ?? "";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  if (variant === "desktop") {
    return (
      <div
        ref={menuRef}
        className="absolute right-0 mt-2 w-56 rounded-2xl border border-black/5 bg-white shadow-lg shadow-black/5 py-3 text-sm text-wowzie-text-primary"
      >
        <div className="px-4 pb-3 border-b border-black/5">
          <div className="text-sm font-semibold">{displayName}</div>
          {email && (
            <div className="text-xs text-wowzie-text-muted mt-0.5">{email}</div>
          )}
        </div>

        <nav className="py-2">
          <NavLink
            to="/profile"
            onClick={onClose}
            className={`${linkBase} px-4 py-2.5`}
          >
            View Profile
          </NavLink>

          <NavLink
            to="/settings"
            onClick={onClose}
            className={`${linkBase} px-4 py-2.5`}
          >
            Settings
          </NavLink>

          <NavLink
            to="/help"
            onClick={onClose}
            className={`${linkBase} px-4 py-2.5`}
          >
            Help Center
          </NavLink>
        </nav>

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-wowzie-text-primary"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close menu"
      />

      <div className="absolute right-0 top-0 h-full w-[86%] max-w-sm bg-white shadow-xl border-l border-wowzie-borderSubtle isolate">
        <div className="h-16 px-4 flex items-center justify-between border-b border-wowzie-borderSubtle">
          <span className="text-sm font-medium text-wowzie-text">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-wowzie-borderSubtle bg-wowzie-surface"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          <div className="pb-4 border-b border-black/5">
            <div className="text-2xl font-semibold text-wowzie-text-primary leading-tight">
              {displayName}
            </div>
            {email && <div className="text-sm text-wowzie-text-muted mt-1">{email}</div>}
          </div>

          <nav className="pt-4 text-base text-wowzie-text-primary">
            <NavLink to="/activities" onClick={onClose} className="block py-3">
              Activities
            </NavLink>
            <NavLink to="/calendars" onClick={onClose} className="block py-3">
              Calendars
            </NavLink>
            <NavLink to="/messages" onClick={onClose} className="block py-3">
              Messages
            </NavLink>
            <NavLink to="/notifications" onClick={onClose} className="block py-3">
              Notifications
            </NavLink>

            <NavLink to={hostDashboardPath} onClick={onClose} className="block py-3">
              Host Dashboard
            </NavLink>

            <NavLink to="/profile" onClick={onClose} className="block py-3">
              View Profile
            </NavLink>
            <NavLink to="/settings" onClick={onClose} className="block py-3">
              Settings
            </NavLink>
            <NavLink to="/help" onClick={onClose} className="block py-3">
              Help Center
            </NavLink>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-left py-3"
            >
              Sign Out
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};
