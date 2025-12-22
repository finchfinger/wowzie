import React, { useMemo, useState } from "react";

type CalendarCardProps = {
  title: string;
  subtitle?: string | null;
  metaLine?: string | null; // ex: "Added on Sep 2, 2025"
  avatarEmoji?: string | null;

  onDetails?: () => void;
  onMessage?: () => void;
  onRemove?: () => void;

  className?: string;
};

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export const CalendarCard: React.FC<CalendarCardProps> = ({
  title,
  subtitle,
  metaLine,
  avatarEmoji,
  onDetails,
  onMessage,
  onRemove,
  className,
}) => {
  const [open, setOpen] = useState(false);

  const hasMenu = !!(onDetails || onMessage || onRemove);

  const actions = useMemo(
    () =>
      [
        onDetails ? { label: "See calendar details", onClick: onDetails } : null,
        onMessage ? { label: "Send a message", onClick: onMessage } : null,
        onRemove
          ? { label: "Remove calendar", onClick: onRemove, danger: true }
          : null,
      ].filter(Boolean) as Array<{ label: string; onClick: () => void; danger?: boolean }>,
    [onDetails, onMessage, onRemove]
  );

  return (
    <article
      className={cx(
        "relative rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-sm shrink-0"
            aria-hidden="true"
            title={avatarEmoji ?? ""}
          >
            {avatarEmoji ?? "📅"}
          </div>

          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">
              {title}
            </div>

            {(subtitle || metaLine) && (
              <div className="mt-0.5 text-xs text-gray-500 truncate">
                {subtitle ? subtitle : null}
                {subtitle && metaLine ? <span className="mx-1">·</span> : null}
                {metaLine ? metaLine : null}
              </div>
            )}
          </div>
        </div>

        {hasMenu ? (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-700"
              aria-label="Calendar actions"
            >
              ⋮
            </button>

            {open ? (
              <div
                className="absolute right-0 mt-2 w-52 rounded-xl border border-black/10 bg-white shadow-lg overflow-hidden z-20"
                role="menu"
              >
                {actions.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    className={cx(
                      "w-full text-left px-3 py-2 text-xs hover:bg-gray-50",
                      a.danger ? "text-rose-600" : "text-gray-900"
                    )}
                    onClick={() => {
                      setOpen(false);
                      a.onClick();
                    }}
                    role="menuitem"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
};
