import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { Button } from "./button";

type AlertTone = "success" | "error" | "warning" | "info" | "violet" | "dark";

const TONE_STYLES: Record<AlertTone, string> = {
  success: "bg-green-300 text-neutral-900",
  error:   "bg-red-300 text-neutral-900",
  warning: "bg-yellow-400 text-neutral-900",
  info:    "bg-blue-100 text-blue-900",
  violet:  "bg-violet-100 text-violet-900",
  dark:    "bg-neutral-900 text-white",
};

const TONE_ICON_COLOR: Record<AlertTone, string> = {
  success: "text-neutral-900",
  error:   "text-neutral-900",
  warning: "text-neutral-900",
  info:    "text-blue-700",
  violet:  "text-violet-700",
  dark:    "text-white",
};

const TONE_BUTTON_HOVER: Record<AlertTone, string> = {
  success: "hover:bg-black/10",
  error:   "hover:bg-black/10",
  warning: "hover:bg-black/10",
  info:    "hover:bg-black/10",
  violet:  "hover:bg-black/10",
  dark:    "hover:bg-white/15",
};

type AlertProps = {
  tone: AlertTone;
  /** Material Symbols Rounded icon name, e.g. "lightbulb" or "info" */
  icon?: string;
  children: ReactNode;
  action?: { label: string; onClick: () => void };
  className?: string;
};

export function Alert({ tone, icon, children, action, className }: AlertProps) {
  return (
    <div
      role="alert"
      style={{ borderRadius: 4 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 text-sm",
        TONE_STYLES[tone],
        className,
      )}
    >
      {icon && (
        <span
          className={cn("material-symbols-outlined select-none shrink-0", TONE_ICON_COLOR[tone])}
          style={{ fontSize: 18 }}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <div className="flex-1">{children}</div>
      {action && (
        <Button
          variant="ghost"
          size="sm"
          onClick={action.onClick}
          className={cn("shrink-0 rounded-full -my-1 hover:bg-transparent", TONE_ICON_COLOR[tone], TONE_BUTTON_HOVER[tone], "hover:text-inherit")}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
