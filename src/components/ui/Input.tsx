import React from "react";
import clsx from "clsx";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export const Input: React.FC<InputProps> = ({
  className,
  error,
  ...props
}) => {
  return (
    <input
      className={clsx(
        "block w-full rounded-xl border bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500",
        "placeholder:text-gray-400 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed",
        error ? "border-red-500" : "border-black/10",
        className
      )}
      {...props}
    />
  );
};
