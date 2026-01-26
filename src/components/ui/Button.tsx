// src/components/ui/Button.tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../../lib/utils";

export type ButtonSize = "xs" | "sm" | "md" | "lg";
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "subtle"
  | "outline"
  | "ghost";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;

  // NEW: icon button mode (square)
  icon?: boolean;
};

const base =
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-60";

const sizes: Record<ButtonSize, string> = {
  xs: "h-8 px-3 text-xs",
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

// NEW: square padding for icon buttons (matches height)
const iconSizes: Record<ButtonSize, string> = {
  xs: "h-8 w-8 p-0",
  sm: "h-9 w-9 p-0",
  md: "h-11 w-11 p-0",
  lg: "h-12 w-12 p-0",
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-violet-600 text-white hover:bg-violet-700",
  secondary: "bg-gray-900 text-white hover:bg-gray-800",
  subtle: "bg-gray-100 text-gray-900 hover:bg-gray-200",
  outline: "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50",
  ghost: "bg-transparent text-gray-900 hover:bg-gray-100",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", icon = false, asChild, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(
          base,
          variants[variant],
          icon ? iconSizes[size] : sizes[size],
          // nicer icon alignment if you pass an svg
          icon ? "shrink-0" : "",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
