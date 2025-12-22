import React from "react";
import clsx from "clsx";

type GridProps = {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: string;
  className?: string;
};

/**
 * Tailwind does not reliably generate classes from dynamic strings like:
 *   `lg:grid-cols-${cols}`
 * So we map to explicit class names to keep builds stable.
 */
const LG_COLS: Record<NonNullable<GridProps["cols"]>, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  6: "lg:grid-cols-6",
  12: "lg:grid-cols-12",
};

export const Grid: React.FC<GridProps> = ({
  children,
  cols = 12,
  gap = "gap-6",
  className,
}) => {
  return (
    <div
      className={clsx(
        "grid grid-cols-1 sm:grid-cols-2",
        LG_COLS[cols],
        gap,
        className
      )}
    >
      {children}
    </div>
  );
};
