"use client";

import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ActionsMenu } from "@/components/ui/ActionsMenu";

export type GuestRosterItemData = {
  id: string;
  parent_name: string;
  email: string;
  phone: string | null;
  children_count: number;
  last_activity_name: string | null;
};

type Props = {
  guest: GuestRosterItemData;
};

export function GuestRosterItem({ guest }: Props) {
  const router = useRouter();
  const childLabel =
    guest.children_count === 1 ? "1 child" : `${guest.children_count} children`;

  const handleRowClick = () => router.push(`/host/guests/${guest.id}`);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleRowClick(); }}
      className="group flex items-center gap-3 py-3 cursor-pointer hover:bg-muted/50 transition-colors focus:outline-none"
    >
      <UserAvatar name={guest.parent_name} size={40} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">{guest.parent_name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{childLabel}</p>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <ActionsMenu
          items={[
            { label: "See guest detail", onSelect: () => router.push(`/host/guests/${guest.id}`) },
            { label: "Message guest",    onSelect: () => router.push(`/messages?to=${guest.id}`) },
          ]}
        />
      </div>
    </div>
  );
}
