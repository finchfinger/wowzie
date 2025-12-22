import React from "react";
import clsx from "clsx";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "subtle" | "outline";
  size?: "sm" | "md" | "lg";
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}) => {
  const base =
    "inline-flex items-center justify-center rounded-lg font-medium transition";

  const sizes = {
    sm: "text-sm px-3 py-1.5",
    md: "text-sm px-4 py-2", // your old default
    lg: "text-base px-5 py-3",
  };

  const variants = {
    primary: "bg-violet-600 text-white hover:bg-violet-700",
    subtle: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    outline:
      "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50",
  };

  return (
    <button
      className={clsx(base, sizes[size], variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
};
