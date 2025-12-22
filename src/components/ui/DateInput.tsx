import React from "react";
import clsx from "clsx";

type DateInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export const DateInput: React.FC<DateInputProps> = ({
  className,
  error,
  ...props
}) => {
  return (
    <input
      type="date"
      className={clsx(
        "block w-full rounded-xl border bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500",
        "disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed",
        "placeholder:text-gray-400",
        error ? "border-red-500" : "border-black/10",
        className
      )}
      {...props}
    />
  );
};
