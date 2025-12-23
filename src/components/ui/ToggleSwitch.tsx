import React from "react";
import clsx from "clsx";

type ToggleSwitchVariant = "full" | "switch-only";

export type ToggleSwitchProps = {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  srLabel?: string;

  // Keep existing flexibility (won’t break current callers)
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

  const trackClasses = clsx(
    "inline-flex h-6 w-11 items-center rounded-full border transition-colors duration-200 ease-in-out",
    checked ? "bg-violet-600 border-violet-600" : "bg-gray-200 border-gray-300",
    disabled && "opacity-60"
  );

  const knobClasses = clsx(
    "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out",
    checked ? "translate-x-5" : "translate-x-1"
  );

  const switchButton = (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={a11yLabel}
      disabled={disabled}
      onClick={handleClick}
      className={clsx(
        "relative inline-flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-200",
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      )}
    >
      <span className="sr-only">{a11yLabel}</span>
      <span className={trackClasses}>
        <span className={knobClasses} />
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
            {label && <p className="text-sm text-gray-900">{label}</p>}
            {helperText && <p className="mt-0.5 text-xs text-gray-500">{helperText}</p>}
          </>
        )}
      </div>
      {switchButton}
    </div>
  );
};
