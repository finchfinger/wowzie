"use client";

import Image from "next/image";

export type AttendanceFriend = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

export type AttendanceCardProps = {
  friends: AttendanceFriend[];
  /** Total going including people not in friends list */
  totalGoing?: number;
};

const AVATAR_SIZE = 48;
const OVERLAP = 14; // how many px each avatar slides under the previous

function Avatar({ friend, index }: { friend: AttendanceFriend; index: number }) {
  const initial = friend.name.charAt(0).toUpperCase();
  return (
    <div
      className="relative shrink-0 rounded-full border-2 border-background overflow-hidden bg-primary/10"
      style={{
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        marginLeft: index === 0 ? 0 : -OVERLAP,
        zIndex: index,
      }}
    >
      {friend.avatarUrl ? (
        <Image src={friend.avatarUrl} alt={friend.name} fill sizes={`${AVATAR_SIZE}px`} className="object-cover" />
      ) : (
        <span
          className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-primary"
        >
          {initial}
        </span>
      )}
    </div>
  );
}

function formatNames(friends: AttendanceFriend[], totalGoing: number): React.ReactNode {
  const named = friends.slice(0, 2);
  const remainder = totalGoing - named.length;

  const nameNodes = named.map((f, i) => {
    const firstName = f.name.split(" ")[0];
    const lastInitial = f.name.split(" ")[1]?.[0];
    const label = lastInitial ? `${firstName} ${lastInitial}.` : firstName;
    return (
      <span key={f.id} className="underline decoration-dotted underline-offset-2 font-medium" style={{ cursor: "pointer" }}>
        {label}
      </span>
    );
  });

  if (remainder <= 0) {
    // 1 or 2 named friends, no remainder
    return nameNodes.reduce<React.ReactNode[]>((acc, node, i) => {
      if (i === 0) return [node];
      return [...acc, <span key={`sep-${i}`} className="text-muted-foreground">,&nbsp;&nbsp;</span>, node];
    }, []);
  }

  // 2 named + "and X others"
  return (
    <>
      {nameNodes[0]}
      {nameNodes[1] && (
        <><span className="text-muted-foreground">,&nbsp;&nbsp;</span>{nameNodes[1]}</>
      )}
      <span className="text-muted-foreground"> and </span>
      <span className="underline decoration-dotted underline-offset-2 font-medium" style={{ cursor: "pointer" }}>
        {remainder} other{remainder !== 1 ? "s" : ""}
      </span>
    </>
  );
}

export function AttendanceCard({ friends, totalGoing }: AttendanceCardProps) {
  if (!friends || friends.length === 0) return null;

  const total = totalGoing ?? friends.length;
  const visibleAvatars = friends.slice(0, 6);

  return (
    <div className="space-y-3">
      <p className="text-base font-semibold text-foreground">
        {total} of your friends are going
      </p>

      {/* Overlapping avatar row */}
      <div className="flex items-center" style={{ paddingLeft: 0 }}>
        {visibleAvatars.map((friend, i) => (
          <Avatar key={friend.id} friend={friend} index={i} />
        ))}
      </div>

      {/* Name list */}
      <p className="text-sm text-foreground leading-relaxed">
        {formatNames(friends, total)}
      </p>
    </div>
  );
}
