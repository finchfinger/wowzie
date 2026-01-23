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

  // Hard constraints (inclusive)
  minDateISO?: string; // "YYYY-MM-DD"
  maxDateISO?: string; // "YYYY-MM-DD"

  // Extra disable rules (optional)
  disabledDates?: (date: Date) => boolean;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
};

const fromISODate = (iso?: string) => {
  if (!iso) return undefined;
  const parts = iso.split("-");
  if (parts.length !== 3) return undefined;

  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);

  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return undefined;
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;

  // Local date, noon avoids DST edge weirdness in some environments
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  return Number.isFinite(dt.getTime()) ? dt : undefined;
};

const formatDisplayDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${m}/${d}/${y}`;
};

// Compare by ISO string, safe for YYYY-MM-DD
const isoOf = (date: Date) => toISODate(date);

export const DateInput: React.FC<DateInputProps> = ({
  className,
  value,
  onChange,
  error,
  disabled,
  placeholder = "Select date",
  id,
  name,
  minDateISO,
  maxDateISO,
  disabledDates,
  "aria-describedby": ariaDescribedBy,
  ...props
}) => {
  const [open, setOpen] = React.useState(false);

  const selected = fromISODate(value);
  const contentId = React.useId();
  const hiddenId = id ? `${id}__hidden` : undefined;

  const displayText = value ? formatDisplayDate(value) : placeholder;

  const isDisabled = React.useCallback(
    (date: Date) => {
      const iso = isoOf(date);

      if (minDateISO && iso < minDateISO) return true;
      if (maxDateISO && iso > maxDateISO) return true;
      if (disabledDates && disabledDates(date)) return true;

      return false;
    },
    [minDateISO, maxDateISO, disabledDates]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={clsx(
            "h-11 w-full rounded-lg border bg-white px-3 text-left text-sm outline-none",
            "focus:border-violet-300 focus:ring-2 focus:ring-violet-200",
            "disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed",
            error ? "border-red-500" : "border-black/10",
            className
          )}
          aria-label={typeof props["aria-label"] === "string" ? props["aria-label"] : placeholder}
          aria-describedby={ariaDescribedBy}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={contentId}
        >
          <span className={value ? "text-gray-900" : "text-gray-500"}>
            {displayText}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        id={contentId}
        align="start"
        side="bottom"
        sideOffset={8}
        className="w-auto p-3"
      >
        <Calendar
          mode="single"
          selected={selected}
          disabled={isDisabled}
          onSelect={(date) => {
            if (!onChange) return;

            // react-day-picker only calls onSelect for enabled dates,
            // but this keeps us safe if something changes upstream.
            if (date && isDisabled(date)) return;

            const next = date ? toISODate(date) : "";
            onChange({ target: { value: next } });
            setOpen(false);
          }}
          captionLayout="dropdown"
        />
      </PopoverContent>

      {/* Hidden input so forms still have a value if needed */}
      <input
        id={hiddenId}
        type="hidden"
        name={name}
        value={value ?? ""}
        readOnly
        {...props}
      />
    </Popover>
  );
};
