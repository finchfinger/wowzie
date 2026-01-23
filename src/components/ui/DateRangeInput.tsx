import React from "react";
import clsx from "clsx";
import { DateInput } from "./DateInput";

export type DateRangeValue = {
  start?: string; // "YYYY-MM-DD"
  end?: string;   // "YYYY-MM-DD"
};

type DateRangeInputProps = {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  startLabel?: string;
  endLabel?: string;
  className?: string;
};

type DateInputEvent = { target: { value: string } };

const pad2 = (n: number) => String(n).padStart(2, "0");
const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
};

const normalizeDate = (v: string) => {
  const s = v.trim();
  return s.length ? s : undefined;
};

// Works for YYYY-MM-DD
const isAfter = (a?: string, b?: string) => !!(a && b && a > b);
const isBefore = (a?: string, b?: string) => !!(a && b && a < b);

export const DateRangeInput: React.FC<DateRangeInputProps> = ({
  value,
  onChange,
  startLabel = "Start date",
  endLabel = "End date",
  className,
}) => {
  const startId = React.useId();
  const endId = React.useId();
  const startHelpId = React.useId();
  const endHelpId = React.useId();

  const minToday = React.useMemo(() => todayISO(), []);

  const handleStartChange = (e: DateInputEvent) => {
    const nextStart = normalizeDate(e.target.value);

    // Safety net: if someone somehow sets a start before today, clear it.
    const safeStart = nextStart && isBefore(nextStart, minToday) ? undefined : nextStart;

    const nextEnd = safeStart && isAfter(safeStart, value.end) ? undefined : value.end;

    onChange({ start: safeStart, end: nextEnd });
  };

  const handleEndChange = (e: DateInputEvent) => {
    const nextEnd = normalizeDate(e.target.value);

    // Safety net: if someone picks an end before today, clear it.
    const safeEnd = nextEnd && isBefore(nextEnd, minToday) ? undefined : nextEnd;

    const nextStart =
      safeEnd && isBefore(safeEnd, value.start) ? undefined : value.start;

    onChange({ start: nextStart, end: safeEnd });
  };

  // End must be >= max(today, start)
  const endMin = value.start && value.start > minToday ? value.start : minToday;

  return (
    <div className={clsx("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>
      <div className="space-y-1 text-xs">
        <label htmlFor={startId} className="font-medium text-gray-700">
          {startLabel}
        </label>
        <DateInput
          id={startId}
          aria-describedby={startHelpId}
          value={value.start || ""}
          onChange={handleStartChange}
          placeholder="Select date"
          minDateISO={minToday}
          maxDateISO={value.end}
        />
        <p id={startHelpId} className="text-[11px] text-gray-500">
          Future dates only.
        </p>
      </div>

      <div className="space-y-1 text-xs">
        <label htmlFor={endId} className="font-medium text-gray-700">
          {endLabel}
        </label>
        <DateInput
          id={endId}
          aria-describedby={endHelpId}
          value={value.end || ""}
          onChange={handleEndChange}
          placeholder="Select date"
          minDateISO={endMin}
        />
        <p id={endHelpId} className="text-[11px] text-gray-500">
          Must be on or after the start date.
        </p>
      </div>
    </div>
  );
};
