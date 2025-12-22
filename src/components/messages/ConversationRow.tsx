import React from "react";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

type Props = {
  name: string;
  avatar?: string | null;
  preview?: string | null;
  timeLabel?: string;
  unreadCount?: number | null;
  active?: boolean;
  onClick?: () => void;
};

export const ConversationRow: React.FC<Props> = ({
  name,
  avatar,
  preview,
  timeLabel,
  unreadCount,
  active,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "w-full flex items-start gap-3 px-4 py-3 text-left text-xs transition-colors",
        active ? "bg-amber-50" : "hover:bg-gray-50"
      )}
    >
      {/* Avatar */}
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-base">
        {avatar ?? "👋"}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-semibold text-gray-900">{name}</p>

          {timeLabel ? (
            <span className="shrink-0 text-[10px] text-gray-500">{timeLabel}</span>
          ) : null}
        </div>

        {/* ✅ one-line truncation */}
        {preview ? (
          <p className="mt-0.5 truncate text-[11px] text-gray-500">{preview}</p>
        ) : null}
      </div>

      {/* Unread badge */}
      {unreadCount && unreadCount > 0 ? (
        <span className="mt-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
          {unreadCount}
        </span>
      ) : null}
    </button>
  );
};

export default ConversationRow;
