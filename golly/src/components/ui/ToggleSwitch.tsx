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
        "relative inline-flex items-center rounded-full focus:outline-none focus:ring-1 focus:ring-foreground/10",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
      )}
    >
      <span className="sr-only">{a11yLabel}</span>
      <span
        className={cn(
          "inline-flex h-6 w-11 items-center rounded-full border transition-colors duration-200 ease-in-out",
          checked
            ? "bg-primary border-primary"
            : "bg-muted border-border",
          disabled && "opacity-60",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out",
            checked ? "translate-x-5" : "translate-x-1",
          )}
        />
      </span>
    </button>
  );

  if (variant === "switch-only") return switchButton;

  const showLabelBlock = Boolean(label || helperText);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1">
        {showLabelBlock && (
          <>
            {label && (
              <p className="text-sm text-foreground">{label}</p>
            )}
            {helperText && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {helperText}
              </p>
            )}
          </>
        )}
      </div>
      {switchButton}
    </div>
  );
};
