import React from "react";
import clsx from "clsx";

export const Container = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={clsx(
      "max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8",
      className
    )}
  >
    {children}
  </div>
);
