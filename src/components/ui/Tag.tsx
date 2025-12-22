// src/components/ui/Tag.tsx
import React from "react";

type TagProps = {
  label: string;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
};

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export const Tag: React.FC<TagProps> = ({ label, onRemove, disabled, className }) => {
  const removable = typeof onRemove === "function";

  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-gray-800",
        disabled && "opacity-60",
        className
      )}
    >
      <span className="truncate">{label}</span>

      {removable && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className={cx(
            "inline-flex h-5 w-5 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100",
            disabled && "cursor-not-allowed"
          )}
          aria-label={`Remove ${label}`}
        >
          ✕
        </button>
      )}
    </span>
  );
};
