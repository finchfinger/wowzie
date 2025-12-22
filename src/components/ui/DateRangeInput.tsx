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

export const DateRangeInput: React.FC<DateRangeInputProps> = ({
  value,
  onChange,
  startLabel = "Start date",
  endLabel = "End date",
  className,
}) => {
  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, start: e.target.value || undefined });
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, end: e.target.value || undefined });
  };

  return (
    <div className={clsx("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>
      <div className="space-y-1 text-xs">
        <label className="font-medium text-gray-700">{startLabel}</label>
        <DateInput
          value={value.start || ""}
          onChange={handleStartChange}
        />
      </div>

      <div className="space-y-1 text-xs">
        <label className="font-medium text-gray-700">{endLabel}</label>
        <DateInput
          value={value.end || ""}
          onChange={handleEndChange}
        />
      </div>
    </div>
  );
};
