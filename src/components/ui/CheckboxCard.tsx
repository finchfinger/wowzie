import * as React from "react";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

type CheckboxCardProps = {
  id: string;
  title: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (next: boolean) => void;
  rightSlot?: React.ReactNode;
  className?: string;
};

export function CheckboxCard({
  id,
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
  rightSlot,
  className,
}: CheckboxCardProps) {
  return (
    <label
      htmlFor={id}
      className={cx(
        "group relative flex cursor-pointer items-start justify-between gap-4 rounded-xl border bg-white p-4",
        "transition-colors",
        checked
          ? "border-violet-300 ring-2 ring-violet-200"
          : "border-black/10 hover:border-black/20",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        {description ? (
          <div className="mt-1 text-xs leading-5 text-gray-600">{description}</div>
        ) : null}
      </div>

      <div className="mt-0.5 flex shrink-0 items-center gap-2">
        {rightSlot}
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className={cx(
            "h-5 w-5 rounded border border-black/20",
            "accent-violet-600"
          )}
        />
      </div>
    </label>
  );
}

type CheckboxCardsGridProps = {
  children: React.ReactNode;
  className?: string;
};

export function CheckboxCardsGrid({ children, className }: CheckboxCardsGridProps) {
  return <div className={cx("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>{children}</div>;
}
