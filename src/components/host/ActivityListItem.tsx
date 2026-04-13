import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/* ─────────────────────────────────────────────────────────
   ActivityListItem
   A generic list row used inside the host activity detail
   page — sessions, itinerary steps, add-ons, etc.

   • title      — primary label (bold)
   • subtitle   — secondary line (muted, smaller)
   • detail     — tertiary line (muted, smaller)
   • badge      — right-side pill with color variant
   • right      — arbitrary right-side slot (overrides badge)
   • className  — extra classes on the wrapper
───────────────────────────────────────────────────────── */

type BadgeColor = "green" | "amber" | "red" | "muted";

type ActivityListItemProps = {
  title: string;
  subtitle?: string;
  detail?: string;
  badge?: { label: string; color: BadgeColor };
  right?: ReactNode;
  className?: string;
};

const badgeClasses: Record<BadgeColor, string> = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50  text-amber-700  border-amber-200",
  red:   "bg-red-50    text-red-700    border-red-200",
  muted: "bg-muted     text-muted-foreground border-border",
};

const dotClasses: Record<BadgeColor, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red:   "bg-red-500",
  muted: "bg-muted-foreground/50",
};

export function ActivityListItem({
  title,
  subtitle,
  detail,
  badge,
  right,
  className,
}: ActivityListItemProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-3", className)}>
      {/* Left: text */}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        {detail   && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
      </div>

      {/* Right: badge or custom slot */}
      {right ?? (badge && (
        <span className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
          badgeClasses[badge.color],
        )}>
          <span className={cn("h-1.5 w-1.5 rounded-full", dotClasses[badge.color])} />
          {badge.label}
        </span>
      ))}
    </div>
  );
}
