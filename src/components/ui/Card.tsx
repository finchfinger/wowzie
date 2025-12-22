import React from "react";
import clsx from "clsx";

export const Card = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={clsx(
      "bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden",
      className
    )}
    {...props}
  >
    {children}
  </div>
);
