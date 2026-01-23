import * as React from "react";
import { cn } from "../../lib/utils";

export type TextareaProps =
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    error?: boolean;
  };

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  TextareaProps
>(({ className, error, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        // match Input.tsx
        "flex w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground shadow-sm",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-60",

        // textarea-specific
        "min-h-[120px] resize-vertical",

        error ? "border-destructive" : "border-input",
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";
