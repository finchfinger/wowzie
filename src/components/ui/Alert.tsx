import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type AlertTone = "success" | "error" | "warning" | "info" | "violet";

const TONE_STYLES: Record<AlertTone, string> = {
  success: "bg-green-50 text-green-700",
  error:   "bg-destructive/5 text-destructive",
  warning: "bg-amber-50 text-amber-900",
  info:    "bg-blue-50 text-blue-700",
  violet:  "bg-violet-50 text-violet-800",
};

const TONE_ICON_COLOR: Record<AlertTone, string> = {
  success: "text-green-600",
  error:   "text-destructive",
  warning: "text-amber-600",
  info:    "text-blue-500",
  violet:  "text-violet-600",
};

type AlertProps = {
  tone: AlertTone;
  /** Material Symbols Rounded icon name, e.g. "lightbulb" or "info" */
  icon?: string;
  children: ReactNode;
  className?: string;
};

export function Alert({ tone, icon, children, className }: AlertProps) {
  return (
    <div
      role="alert"
      style={{ borderRadius: 4 }}
      className={cn(
        "flex gap-3 px-4 py-3 text-sm",
        TONE_STYLES[tone],
        className,
      )}
    >
      {icon && (
        <span
          className={cn("material-symbols-rounded select-none shrink-0 mt-px", TONE_ICON_COLOR[tone])}
          style={{ fontSize: 18 }}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <div>{children}</div>
    </div>
  );
}
