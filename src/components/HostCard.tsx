"use client";

import Link from "next/link";
import Image from "next/image";

export type HostCardProps = {
  hostName: string;
  hostAvatarUrl?: string | null;
  isOwner?: boolean;
  onMessage?: () => void;
  onEdit?: () => void;
  externalUrl?: string | null;
  orgSlug?: string | null;
};

export function HostCard({
  hostName,
  hostAvatarUrl,
  isOwner = false,
  onMessage,
  onEdit,
  externalUrl,
  orgSlug,
}: HostCardProps) {
  const initial = (hostName || "?").charAt(0).toUpperCase();

  const nameNode = orgSlug ? (
    <Link
      href={`/org/${orgSlug}`}
      className="font-semibold text-foreground hover:underline decoration-dotted underline-offset-2"
      style={{ fontSize: 15 }}
    >
      {hostName}
    </Link>
  ) : (
    <span className="font-semibold text-foreground" style={{ fontSize: 15 }}>
      {hostName}
      {isOwner && (
        <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">(that&apos;s you!)</span>
      )}
    </span>
  );

  const actionNode = isOwner ? (
    <button
      type="button"
      onClick={onEdit}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
    >
      <span className="material-symbols-rounded select-none" style={{ fontSize: 14 }} aria-hidden>edit</span>
      Edit listing
    </button>
  ) : externalUrl ? (
    <a
      href={externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
    >
      <span className="material-symbols-rounded select-none" style={{ fontSize: 14 }} aria-hidden>open_in_new</span>
      Visit website
    </a>
  ) : (
    <button
      type="button"
      onClick={onMessage}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
    >
      <span className="material-symbols-rounded select-none" style={{ fontSize: 14 }} aria-hidden>chat</span>
      Message
    </button>
  );

  return (
    <div className="space-y-3">
      <p className="text-base font-semibold text-foreground">Hosted By</p>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Square avatar */}
          {hostAvatarUrl ? (
            <div className="relative h-14 w-14 shrink-0 overflow-hidden" style={{ borderRadius: 10 }}>
              <Image src={hostAvatarUrl} alt={hostName} fill sizes="56px" className="object-cover" />
            </div>
          ) : (
            <div
              className="h-14 w-14 shrink-0 bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary"
              style={{ borderRadius: 10 }}
            >
              {initial}
            </div>
          )}

          {nameNode}
        </div>

        {actionNode}
      </div>
    </div>
  );
}
