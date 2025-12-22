// src/components/ui/Badge.tsx
import React from "react";
import clsx from "clsx";

type BadgeProps = {
  children: React.ReactNode;
  tone?: "neutral" | "destructive";
  size?: "sm" | "md";
  className?: string;
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  tone = "neutral",
  size = "sm",
  className,
}) => {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full font-medium",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-0.5",
        tone === "neutral" &&
          "bg-gray-100 text-gray-700 border border-gray-200",
        tone === "destructive" &&
          "bg-rose-50 text-rose-700 border border-rose-100",
        className,
      )}
    >
      {children}
    </span>
  );
};
