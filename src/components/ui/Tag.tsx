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
        height: isSmall ? 24 : 28,
        borderRadius: isSmall ? 4 : 4,
        background: "rgba(87, 55, 246, 0.08)",
        paddingLeft: isSmall ? 6 : 8,
        paddingRight: removable ? (isSmall ? 4 : 6) : (isSmall ? 6 : 8),
        gap: isSmall ? 4 : 8,
        ...style,
      }}
    >
      <span
        style={{
          fontSize: isSmall ? 10 : 11,
          lineHeight: "16px",
          fontWeight: 500,
          color: "#5737F6",
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
            className="material-symbols-outlined select-none"
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
