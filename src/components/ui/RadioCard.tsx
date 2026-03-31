import { cn } from "@/lib/utils";

type RadioCardProps = {
  id: string;
  name: string;
  title: string;
  description?: string;
  value: string;
  selectedValue: string;
  disabled?: boolean;
  onChange: (v: string) => void;
  className?: string;
};

export function RadioCard({
  id,
  name,
  title,
  description,
  value,
  selectedValue,
  disabled,
  onChange,
  className,
}: RadioCardProps) {
  const checked = value === selectedValue;
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
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="mt-0.5 accent-primary"
      />
      <div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        {description && (
          <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
        )}
      </div>
    </label>
  );
}
