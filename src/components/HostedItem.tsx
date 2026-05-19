"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type HostedItemProps = {
  hostName: string;
  hostAvatarUrl?: string | null;
  hostProfileHref: string;
  onContact?: () => void;
};

export function HostedItem({ hostName, hostAvatarUrl, hostProfileHref, onContact }: HostedItemProps) {
  const initial = (hostName || "?").charAt(0).toUpperCase();

  return (
    <Link
      href={hostProfileHref}
      className="flex items-center focus:outline-none"
      style={{
        gap: 12,
        textDecoration: "none",
        paddingRight: 4,
      }}
      aria-label={`View ${hostName}'s profile`}
    >
      {/* Avatar */}
      <div
        className="shrink-0 overflow-hidden rounded"
        style={{ width: 48, height: 48 }}
      >
        {hostAvatarUrl ? (
          <div className="relative w-full h-full">
            <Image src={hostAvatarUrl} alt={hostName} fill sizes="40px" className="object-cover" />
          </div>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.1)", fontSize: 15, fontWeight: 700, color: "rgba(0,0,0,0.4)" }}
          >
            {initial}
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p style={{ fontSize: 12, lineHeight: "16px", fontWeight: 400, color: "rgba(0,0,0,0.5)" }}>
            Hosted by
          </p>
        </div>
        <p style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "rgba(0,0,0,0.8)" }} className="truncate">
          {hostName}
        </p>
      </div>

      {/* Trailing three-dot menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Host options"
            onClick={(e) => e.preventDefault()}
            className="shrink-0 flex items-center justify-center rounded-full hover:bg-black/[0.08] transition-colors"
            style={{ width: 36, height: 36 }}
          >
            <span
              className="material-symbols-outlined select-none"
              style={{ fontSize: 20, color: "rgba(0,0,0,0.5)" }}
              aria-hidden
            >
              more_vert
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onContact && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                onContact();
              }}
            >
              <span className="material-symbols-outlined select-none mr-2" style={{ fontSize: 16 }} aria-hidden>
                mail
              </span>
              Contact host
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={hostProfileHref} onClick={(e) => e.stopPropagation()}>
              <span className="material-symbols-outlined select-none mr-2" style={{ fontSize: 16 }} aria-hidden>
                person
              </span>
              See details
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Link>
  );
}
