// src/components/ui/Checkbox.tsx
import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

type LegacyOnChange = (e: React.ChangeEvent<HTMLInputElement>) => void;

type RadixRootProps = React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>;

export type CheckboxProps = Omit<
  RadixRootProps,
  "checked" | "defaultChecked" | "onCheckedChange" | "onChange"
> & {
  /**
   * Legacy API (matches your existing pages):
   * <Checkbox checked={x} onChange={(e) => setX(e.target.checked)} />
   */
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: LegacyOnChange;

  /**
   * Optional Radix-style callback.
   */
  onCheckedChange?: (checked: boolean) => void;

  label?: string;
};

export const Checkbox: React.FC<CheckboxProps> = ({
  className,
  checked,
  defaultChecked,
  onChange,
  onCheckedChange,
  disabled,
  label,
  ...props
}) => {
  const emitLegacyOnChange = (next: boolean) => {
    if (!onChange) return;
    const synthetic = {
      target: { checked: next },
      currentTarget: { checked: next },
    } as any as React.ChangeEvent<HTMLInputElement>;
    onChange(synthetic);
  };

  return (
    <label
      className={cn(
        "inline-flex items-start gap-2",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      )}
    >
      <CheckboxPrimitive.Root
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onCheckedChange={(v) => {
          const next = v === true;
          onCheckedChange?.(next);
          emitLegacyOnChange(next);
        }}
        className={cn(
          "mt-0.5 peer h-4 w-4 shrink-0 rounded border border-input bg-background shadow-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
          "data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
          <Check className="h-3 w-3" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>

      {label ? <span className="text-xs text-gray-700">{label}</span> : null}
    </label>
  );
};

export default Checkbox;
