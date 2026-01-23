// src/components/ui/DateInput.tsx
import React from "react";
import clsx from "clsx";

import { Popover, PopoverTrigger, PopoverContent } from "./popover";
import { Calendar } from "./calendar";

type DateInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value?: string; // "YYYY-MM-DD"
  onChange?: (e: { target: { value: string } }) => void;
  error?: boolean;
  placeholder?: string;
};

const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fromISODate = (iso?: string) => {
  if (!iso) return undefined;
  const t = Date.parse(`${iso}T00:00:00`);
  return Number.isFinite(t) ? new Date(t) : undefined;
};

const formatDisplayDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${m}/${d}/${y}`;
};

export const DateInput: React.FC<DateInputProps> = ({
  className,
  value,
  onChange,
  error,
  disabled,
  placeholder = "Select date",
  ...props
}) => {
  const selected = fromISODate(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={clsx(
            "h-11 w-full rounded-lg border bg-white px-3 text-left text-sm outline-none",
            "focus:border-violet-300 focus:ring-2 focus:ring-violet-200",
            "disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed",
            error ? "border-red-500" : "border-black/10",
            className
          )}
          aria-label={placeholder}
        >
          <span className={value ? "text-gray-900" : "text-gray-500"}>
            {value ? formatDisplayDate(value) : placeholder}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" side="bottom" sideOffset={8} className="w-auto p-3">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (!onChange) return;
            const next = date ? toISODate(date) : "";
            onChange({ target: { value: next } });
          }}
          captionLayout="dropdown"
        />
      </PopoverContent>

      {/* Hidden input so forms still have a value if needed */}
      <input type="hidden" value={value ?? ""} readOnly {...props} />
    </Popover>
  );
};
