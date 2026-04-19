"use client";

import React from "react";
import { cn } from "@/lib/utils";

type ToggleSwitchVariant = "full" | "switch-only";

export type ToggleSwitchProps = {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  srLabel?: string;
  helperText?: string;
  disabled?: boolean;
  id?: string;
  variant?: ToggleSwitchVariant;
};

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  label,
  srLabel,
  helperText,
  checked,
  onChange,
  disabled = false,
  id,
  variant = "full",
}) => {
  const a11yLabel = srLabel || label || "Toggle";

  const handleClick = () => {
    if (disabled) return;
    onChange(!checked);
  };

  const switchButton = (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={a11yLabel}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        // Track — M3 spec: 52×32dp, fully rounded
        "relative inline-flex h-8 w-[52px] shrink-0 cursor-pointer items-center rounded-full border-2 outline-none transition-all duration-200",
        "focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "border-transparent bg-primary"
          : "border-input bg-muted",
      )}
    >
      <span className="sr-only">{a11yLabel}</span>
      {/* Thumb — 16×16 OFF → 24×24 ON, slides left→right */}
      <span
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-sm transition-all duration-200",
          checked ? "h-6 w-6 translate-x-[22px]" : "h-4 w-4 translate-x-[2px]",
        )}
      />
    </button>
  );

  if (variant === "switch-only") return switchButton;

  const showLabelBlock = Boolean(label || helperText);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1">
        {showLabelBlock && (
          <>
            {label && <p className="text-sm text-foreground">{label}</p>}
            {helperText && (
              <p className="mt-0.5 text-xs text-muted-foreground">{helperText}</p>
            )}
          </>
        )}
      </div>
      {switchButton}
    </div>
  );
};
