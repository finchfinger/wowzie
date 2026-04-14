import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type AlertTone = "success" | "error" | "warning" | "info";

const TONE_STYLES: Record<AlertTone, string> = {
  success: "bg-green-50 text-green-700 border border-green-200",
  error:   "bg-destructive/5 text-destructive border border-destructive/20",
  warning: "bg-amber-50 text-amber-900 border border-amber-200",
  info:    "bg-blue-50 text-blue-700 border border-blue-200",
};

const TONE_ICON_COLOR: Record<AlertTone, string> = {
  success: "text-green-600",
  error:   "text-destructive",
  warning: "text-amber-600",
  info:    "text-blue-500",
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
      className={cn(
        "flex gap-3 rounded-xl px-4 py-3 text-sm",
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
