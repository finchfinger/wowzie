import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "./calendar";

const meta = {
  title: "UI/Calendar",
  component: Calendar,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Stories ─────────────────────────────────────────── */

export const SingleSelect: Story = {
  render: () => {
    const [selected, setSelected] = useState<Date | undefined>(undefined);
    return (
      <div className="space-y-2">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
        />
        <p className="text-center text-xs text-muted-foreground">
          {selected ? selected.toLocaleDateString() : "No date selected"}
        </p>
      </div>
    );
  },
  args: {},
};

export const RangeSelect: Story = {
  render: () => {
    const [range, setRange] = useState<DateRange | undefined>(undefined);
    return (
      <div className="space-y-2">
        <Calendar
          mode="range"
          selected={range}
          onSelect={setRange}
          numberOfMonths={2}
        />
        <p className="text-center text-xs text-muted-foreground">
          {range?.from
            ? `${range.from.toLocaleDateString()} → ${range.to?.toLocaleDateString() ?? "…"}`
            : "Select a range"}
        </p>
      </div>
    );
  },
  args: {},
};

export const WithPreselectedDate: Story = {
  render: () => {
    const [selected, setSelected] = useState<Date | undefined>(
      new Date("2026-07-14")
    );
    return (
      <Calendar
        mode="single"
        selected={selected}
        onSelect={setSelected}
        defaultMonth={new Date("2026-07-01")}
      />
    );
  },
  args: {},
};

export const DropdownCaption: Story = {
  render: () => {
    const [selected, setSelected] = useState<Date | undefined>(undefined);
    return (
      <Calendar
        mode="single"
        selected={selected}
        onSelect={setSelected}
        captionLayout="dropdown"
        fromYear={2024}
        toYear={2030}
      />
    );
  },
  args: {},
};

export const WithDisabledDates: Story = {
  render: () => {
    const [selected, setSelected] = useState<Date | undefined>(undefined);
    // Disable past dates and weekends for this demo
    const isPast = (date: Date) => date < new Date(new Date().setHours(0, 0, 0, 0));
    const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;
    return (
      <div className="space-y-2">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          disabled={(date) => isPast(date) || isWeekend(date)}
        />
        <p className="text-center text-xs text-muted-foreground">
          Weekdays only, no past dates
        </p>
      </div>
    );
  },
  args: {},
};

export const NoOutsideDays: Story = {
  render: () => {
    const [selected, setSelected] = useState<Date | undefined>(undefined);
    return (
      <Calendar
        mode="single"
        selected={selected}
        onSelect={setSelected}
        showOutsideDays={false}
      />
    );
  },
  args: {},
};
