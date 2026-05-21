"use client";

import { cn } from "@/lib/utils";

export type SegmentOption<T extends string = string> = {
  value: T;
  label: string;
  /** Material Symbols Outlined icon name shown when unselected (replaced by check when selected) */
  icon?: string;
};

type SegmentedControlProps<T extends string = string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Show a check icon on the active segment (M3 canonical) */
  showCheck?: boolean;
  className?: string;
};

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  showCheck = false,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/50 p-0.5",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const showIcon = showCheck || opt.icon;

        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-medium",
              "outline-none transition-all duration-200",
              "focus-visible:ring-2 focus-visible:ring-primary/30",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {showIcon && (
              <span
                className={cn(
                  "material-symbols-outlined select-none leading-none",
                  "transition-all duration-200",
                  active ? "text-[14px]" : "text-[14px]",
                )}
                style={{ fontVariationSettings: "'wght' 400, 'FILL' 0, 'GRAD' 0, 'opsz' 20" }}
              >
                {active && showCheck ? "check" : (opt.icon ?? "check")}
              </span>
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
