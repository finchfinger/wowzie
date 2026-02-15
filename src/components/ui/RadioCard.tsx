import * as React from "react";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

type RadioCardProps = {
  name: string;
  id: string;
  title: string;
  description?: string;
  value: string;
  selectedValue: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
  className?: string;
};

export function RadioCard({
  name,
  id,
  title,
  description,
  value,
  selectedValue,
  disabled,
  onValueChange,
  className,
}: RadioCardProps) {
  const checked = selectedValue === value;

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

      <input
        id={id}
        name={name}
        type="radio"
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onValueChange(value)}
        className={cx("mt-0.5 h-5 w-5 accent-violet-600")}
      />
    </label>
  );
}

export function RadioCardsGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cx("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>{children}</div>;
}
