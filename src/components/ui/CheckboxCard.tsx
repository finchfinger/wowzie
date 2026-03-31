import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type CheckboxCardProps = {
  id: string;
  title: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  /** Optional slot for extra content on the right (e.g. a price or badge) */
  rightSlot?: ReactNode;
  className?: string;
};

export function CheckboxCard({
  id,
  title,
  description,
  checked,
  disabled,
  onChange,
  rightSlot,
  className,
}: CheckboxCardProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors",
        checked ? "border-primary bg-primary/5" : "border-input bg-transparent hover:bg-gray-50",
        disabled && "opacity-60 cursor-not-allowed",
        className,
      )}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 accent-primary"
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        {description && (
          <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
        )}
      </div>
      {rightSlot}
    </label>
  );
}
