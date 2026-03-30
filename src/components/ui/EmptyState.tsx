import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

/* ─────────────────────────────────────────────────────────
   EmptyState
   Centered illustration + title + description + optional CTA.
   Used wherever a list or section has no data yet.

   Usage:
     <EmptyState
       icon="child_hat"
       iconBg="bg-yellow-300"
       iconColor="text-yellow-900"
       title="No contacts yet"
       description="New bookings will show up here, or you can add someone manually."
       action={{ label: "Add a person", onClick: () => setOpen(true) }}
     />
───────────────────────────────────────────────────────── */

type EmptyStateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

type EmptyStateProps = {
  /** Material Symbols Rounded icon name, e.g. "child_hat" or "camping" */
  icon: string;
  /** Tailwind bg class for the icon circle, e.g. "bg-yellow-300" */
  iconBg?: string;
  /** Tailwind text class for the icon colour, e.g. "text-yellow-900" */
  iconColor?: string;
  /** Icon size in px — defaults to 28 */
  iconSize?: number;
  title: string;
  description?: ReactNode;
  action?: EmptyStateAction;
  /** Extra classes on the outer wrapper */
  className?: string;
};

export function EmptyState({
  icon,
  iconBg = "bg-muted",
  iconColor = "text-muted-foreground",
  iconSize = 28,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center py-16 px-6",
        className,
      )}
    >
      {/* Icon circle — 56px fixed */}
      <div
        className={cn(
          "mb-5 flex h-14 w-14 items-center justify-center rounded-full",
          iconBg,
        )}
      >
        <span
          className={cn("material-symbols-rounded select-none", iconColor)}
          style={{ fontSize: iconSize }}
          aria-hidden
        >
          {icon}
        </span>
      </div>

      {/* Text */}
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-2 max-w-xs text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}

      {/* Action */}
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Button variant="outline" asChild>
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button variant="outline" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
