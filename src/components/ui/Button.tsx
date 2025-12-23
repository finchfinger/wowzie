import React from "react";
import clsx from "clsx";

export type ButtonSize = "xs" | "sm" | "md" | "lg";
export type ButtonVariant = "primary" | "secondary" | "subtle" | "outline" | "ghost";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  className,
  disabled,
  ...props
}) => {
  const base =
    "inline-flex items-center justify-center rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-violet-200 focus:ring-offset-2";

  const sizes: Record<ButtonSize, string> = {
    xs: "text-xs px-2.5 py-1.5",
    sm: "text-sm px-3 py-1.5",
    md: "text-sm px-4 py-2",
    lg: "text-base px-5 py-3",
  };

  const variants: Record<ButtonVariant, string> = {
    primary: "bg-violet-600 text-white hover:bg-violet-700",
    secondary: "bg-gray-900 text-white hover:bg-gray-800",
    subtle: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    outline: "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50",
    ghost: "bg-transparent text-gray-900 hover:bg-gray-100",
  };

  const disabledClasses = "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:brightness-100";

  return (
    <button
      disabled={disabled}
      className={clsx(base, sizes[size], variants[variant], disabledClasses, className)}
      {...props}
    >
      {children}
    </button>
  );
};
