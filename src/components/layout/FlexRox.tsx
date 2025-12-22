import React from "react";
import clsx from "clsx";

export const FlexRow = ({
  children,
  className,
  align = "center",
  justify = "between",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
  justify?: "start" | "center" | "end" | "between";
}) => (
  <div
    className={clsx(
      "flex",
      {
        "items-start": align === "start",
        "items-center": align === "center",
        "items-end": align === "end",
        "justify-start": justify === "start",
        "justify-center": justify === "center",
        "justify-end": justify === "end",
        "justify-between": justify === "between",
      },
      className
    )}
  >
    {children}
  </div>
);
