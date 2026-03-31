import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type AlertTone = "success" | "error" | "warning" | "info";

const TONE_STYLES: Record<AlertTone, string> = {
  success: "bg-green-50 text-green-700 border border-green-200",
  error:   "bg-destructive/5 text-destructive border border-destructive/20",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  info:    "bg-blue-50 text-blue-700 border border-blue-200",
};

type AlertProps = {
  tone: AlertTone;
  children: ReactNode;
  className?: string;
};

export function Alert({ tone, children, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl px-4 py-3 text-sm",
        TONE_STYLES[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
