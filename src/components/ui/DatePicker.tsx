// components/ui/DateInput.tsx
import React from "react";
import clsx from "clsx";

type DateInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const DateInput: React.FC<DateInputProps> = ({ className, ...props }) => (
  <input
    type="date"
    className={clsx(
      "block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500",
      className,
    )}
    {...props}
  />
);
