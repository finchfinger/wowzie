import React from "react";
import { cn } from "@/lib/utils";

type TagProps = {
  label: string;
  size?: "sm" | "md";
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export function Tag({ label, size = "md", onRemove, disabled, className, style }: TagProps) {
  const removable = typeof onRemove === "function";
  const isSmall = size === "sm";

  return (
    <span
      className={cn(disabled && "opacity-60", className)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: isSmall ? 24 : 32,
        borderRadius: isSmall ? 4 : 4,
        background: "var(--md-sys-color-secondary-container, #E8DEF8)",
        paddingLeft: isSmall ? 8 : 12,
        paddingRight: removable ? (isSmall ? 6 : 8) : (isSmall ? 8 : 12),
        gap: isSmall ? 4 : 8,
        ...style,
      }}
    >
      <span
        style={{
          fontSize: isSmall ? 10 : 12,
          lineHeight: "16px",
          fontWeight: 500,
          color: "var(--md-sys-color-on-secondary-container, #1D192B)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>

      {removable && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove ${label}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 18,
            height: 18,
            borderRadius: 9,
            background: "transparent",
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          <span
            className="material-symbols-rounded select-none"
            style={{ fontSize: 16, lineHeight: 1, color: "var(--md-sys-color-on-secondary-container, #1D192B)" }}
            aria-hidden
          >
            close
          </span>
        </button>
      )}
    </span>
  );
}
