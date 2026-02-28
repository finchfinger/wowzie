"use client";

import React from "react";
import { cn } from "@/lib/utils";
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
  minDateISO?: string;
  maxDateISO?: string;
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

  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
    return undefined;
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;

  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  return Number.isFinite(dt.getTime()) ? dt : undefined;
};

const formatDisplayDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${m}/${d}/${y}`;
};

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
    [minDateISO, maxDateISO, disabledDates],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            "h-11 w-full rounded-md border bg-transparent px-3 text-left text-sm outline-none transition-colors",
            "hover:bg-gray-50 focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/10",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-destructive" : "border-input",
            className,
          )}
          aria-label={
            typeof props["aria-label"] === "string"
              ? props["aria-label"]
              : placeholder
          }
          aria-describedby={ariaDescribedBy}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={contentId}
        >
          <span
            className={value ? "text-foreground" : "text-muted-foreground"}
          >
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
            if (date && isDisabled(date)) return;

            const next = date ? toISODate(date) : "";
            onChange({ target: { value: next } });
            setOpen(false);
          }}
          captionLayout="dropdown"
        />
      </PopoverContent>

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
