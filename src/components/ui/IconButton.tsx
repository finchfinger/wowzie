// src/components/ui/IconButton.tsx
import React from "react";
import clsx from "clsx";

type IconButtonProps = {
  children: React.ReactNode;
  ariaLabel: string;
  onClick?: () => void;
  variant?: "ghost" | "subtle";
  className?: string;
};

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  ariaLabel,
  onClick,
  variant = "ghost",
  className,
}) => {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={clsx(
        "inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500",
        variant === "ghost" && "hover:bg-gray-100",
        variant === "subtle" && "bg-gray-100 hover:bg-gray-200",
        className,
      )}
    >
      {children}
    </button>
  );
};
