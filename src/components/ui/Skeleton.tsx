import React from "react";
import clsx from "clsx";

type SkeletonProps = {
  className?: string;
  variant?: "shimmer" | "pulse";
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
};

const ROUNDED: Record<NonNullable<SkeletonProps["rounded"]>, string> = {
  sm: "rounded",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl", // 12px
  full: "rounded-full",
};

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = "shimmer",
  rounded = "md",
}) => {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        "relative overflow-hidden bg-gray-100",
        ROUNDED[rounded],
        variant === "pulse" && "animate-pulse",
        className
      )}
    >
      {variant === "shimmer" && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
      )}
    </div>
  );
};
