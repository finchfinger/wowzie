import React from "react";

type Props = {
  title: string;
  subtitle?: string;         // e.g. "Added on September 2, 2025"
  iconEmoji?: string;        // 📌 or 🐣 etc
  accentColor?: string;      // optional tailwind bg color token
  onClick?: () => void;
  onOpenMenu?: () => void;   // kebab menu
};

export const CalendarListTile: React.FC<Props> = ({
  title,
  subtitle,
  iconEmoji = "📅",
  accentColor = "bg-amber-100",
  onClick,
  onOpenMenu,
}) => {
  return (
    <article
      className="bg-white rounded-xl shadow-sm ring-1 ring-black/5 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`h-8 w-8 rounded-full flex items-center justify-center text-base ${accentColor}`}
        >
          {iconEmoji}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-gray-500 truncate">{subtitle}</p>
          )}
        </div>
      </div>

      {onOpenMenu && (
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
          aria-label="More actions"
          onClick={(e) => {
            e.stopPropagation();
            onOpenMenu();
          }}
        >
          ⋯
        </button>
      )}
    </article>
  );
};
