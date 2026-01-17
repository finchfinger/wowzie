// src/components/ui/ToggleChip.tsx
import React from "react";

type ToggleChipProps = {
  label: string;
  selected: boolean;
  onToggle: () => void;
  className?: string;
  disabled?: boolean;
};

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export const ToggleChip: React.FC<ToggleChipProps> = ({
  label,
  selected,
  onToggle,
  className,
  disabled,
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-2 text-xs",
        "transition-colors outline-none focus:ring-2 focus:ring-violet-200",
        disabled && "opacity-60 cursor-not-allowed",
        selected
          ? "border-violet-600 bg-violet-50 text-violet-900"
          : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50",
        className
      )}
    >
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
};
