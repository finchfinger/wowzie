import React, { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";

type ProfileMenuProps = {
  user: User;
  isOpen: boolean;
  onClose: () => void;
};

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  user,
  isOpen,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // User display name + email
  const meta = (user.user_metadata || {}) as Record<string, any>;
  const nameFromMeta =
    [meta.first_name, meta.last_name].filter(Boolean).join(" ") ||
    meta.full_name;
  const displayName =
    nameFromMeta || user.email?.split("@")[0] || "Your account";
  const email = user.email ?? "";

  // Navigation wrapper
  const handleNav = (path: string) => {
    onClose(); // close gracefully
    navigate(path);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="absolute right-0 mt-2 w-56 rounded-2xl border border-black/5 bg-white shadow-lg shadow-black/5 py-3 text-sm text-wowzie-text-primary"
    >
      {/* Header */}
      <div className="px-4 pb-3 border-b border-black/5">
        <div className="text-sm font-semibold">{displayName}</div>
        {email && (
          <div className="text-xs text-wowzie-text-muted mt-0.5">
            {email}
          </div>
        )}
      </div>

      {/* Links */}
      <nav className="py-2">
        <button
          type="button"
          onClick={() => handleNav("/profile")}
          className="w-full text-left px-4 py-2.5 hover:bg-gray-50"
        >
          View Profile
        </button>

        <button
          type="button"
          onClick={() => handleNav("/settings")}
          className="w-full text-left px-4 py-2.5 hover:bg-gray-50"
        >
          Settings
        </button>

        <button
          type="button"
          onClick={() => handleNav("/help")}
          className="w-full text-left px-4 py-2.5 hover:bg-gray-50"
        >
          Help Center
        </button>
      </nav>

      {/* Sign out */}
      <button
        type="button"
        onClick={handleSignOut}
        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-wowzie-text-primary"
      >
        Sign Out
      </button>
    </div>
  );
};
