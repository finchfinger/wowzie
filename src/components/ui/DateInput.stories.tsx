import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { DateInput } from "./DateInput";

const meta = {
  title: "UI/DateInput",
  component: DateInput,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof DateInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Stories ─────────────────────────────────────────── */

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<string | undefined>(undefined);
    return (
      <div className="w-64 space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Select date
        </label>
        <DateInput
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Pick a date"
        />
        <p className="text-xs text-muted-foreground">Value: {value ?? "—"}</p>
      </div>
    );
  },
  args: {},
};

export const WithValue: Story = {
  render: () => {
    const [value, setValue] = useState<string | undefined>("2026-07-14");
    return (
      <div className="w-64">
        <DateInput
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Pick a date"
        />
      </div>
    );
  },
  args: {},
};

export const WithMinMax: Story = {
  render: () => {
    const [value, setValue] = useState<string | undefined>(undefined);
    return (
      <div className="w-64 space-y-2">
        <DateInput
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Summer dates only"
          minDateISO="2026-06-01"
          maxDateISO="2026-08-31"
        />
        <p className="text-xs text-muted-foreground">
          Allowed: Jun 1 – Aug 31, 2026
        </p>
      </div>
    );
  },
  args: {},
};

export const WithDisabledDates: Story = {
  render: () => {
    const [value, setValue] = useState<string | undefined>(undefined);
    // Disable Jul 4, 5, 11 (Independence Day weekend + following Saturday)
    const blockedISO = new Set(["2026-07-04", "2026-07-05", "2026-07-11"]);
    const disabledDates = (date: Date) => {
      const iso = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");
      return blockedISO.has(iso);
    };
    return (
      <div className="w-64 space-y-2">
        <DateInput
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="July 2026"
          minDateISO="2026-07-01"
          maxDateISO="2026-07-31"
          disabledDates={disabledDates}
        />
        <p className="text-xs text-muted-foreground">
          Blocked: Jul 4, 5, 11
        </p>
      </div>
    );
  },
  args: {},
};

export const Placeholder: Story = {
  render: () => (
    <div className="w-64">
      <DateInput placeholder="Choose a start date" />
    </div>
  ),
  args: {},
};
