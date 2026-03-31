import { cn } from "@/lib/utils";

type StatusBadgeVariant =
  | "published"
  | "draft"
  | "active"
  | "inactive"
  | "confirmed"
  | "pending"
  | "cancelled"
  | "refunded";

const VARIANT_STYLES: Record<StatusBadgeVariant, string> = {
  published: "bg-emerald-50 text-emerald-700",
  active:    "bg-emerald-50 text-emerald-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  draft:     "bg-muted text-muted-foreground",
  inactive:  "bg-muted text-muted-foreground",
  pending:   "bg-amber-50 text-amber-700",
  cancelled: "bg-destructive/10 text-destructive",
  refunded:  "bg-destructive/10 text-destructive",
};

const VARIANT_LABELS: Record<StatusBadgeVariant, string> = {
  published: "Published",
  draft:     "Draft",
  active:    "Active",
  inactive:  "Inactive",
  confirmed: "Confirmed",
  pending:   "Pending",
  cancelled: "Cancelled",
  refunded:  "Refunded",
};

type StatusBadgeProps = {
  variant: StatusBadgeVariant;
  /** Override the default label */
  label?: string;
  className?: string;
};

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
        VARIANT_STYLES[variant],
        className,
      )}
    >
      {label ?? VARIANT_LABELS[variant]}
    </span>
  );
}
