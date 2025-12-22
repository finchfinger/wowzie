import React from "react";
import clsx from "clsx";

export const Stack = ({
  children,
  space = "space-y-4",
  className,
}: {
  children: React.ReactNode;
  space?: string;
  className?: string;
}) => (
  <div className={clsx(space, className)}>
    {children}
  </div>
);
