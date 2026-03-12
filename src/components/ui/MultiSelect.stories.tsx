import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { MultiSelect } from "./MultiSelect";

const meta = {
  title: "UI/MultiSelect",
  component: MultiSelect,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof MultiSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

const ACTIVITIES = [
  { value: "swimming", label: "Swimming" },
  { value: "hiking", label: "Hiking" },
  { value: "painting", label: "Painting" },
  { value: "robotics", label: "Robotics" },
  { value: "horseback", label: "Horseback riding" },
  { value: "archery", label: "Archery" },
  { value: "pottery", label: "Pottery" },
  { value: "cooking", label: "Cooking" },
];

/* ── Stories ─────────────────────────────────────────── */

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <div className="w-72">
        <MultiSelect
          options={ACTIVITIES}
          value={value}
          onChange={setValue}
          placeholder="Select activities…"
        />
        <p className="mt-3 text-xs text-muted-foreground">
          Selected: {value.length ? value.join(", ") : "none"}
        </p>
      </div>
    );
  },
  args: { options: [], value: [], onChange: () => undefined },
};

export const WithPreselected: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>(["swimming", "robotics"]);
    return (
      <div className="w-72">
        <MultiSelect
          options={ACTIVITIES}
          value={value}
          onChange={setValue}
          placeholder="Select activities…"
        />
      </div>
    );
  },
  args: { options: [], value: [], onChange: () => undefined },
};

export const MaxSelected: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <div className="w-72 space-y-2">
        <MultiSelect
          options={ACTIVITIES}
          value={value}
          onChange={setValue}
          placeholder="Pick up to 3…"
          maxSelected={3}
        />
        <p className="text-xs text-muted-foreground">
          {value.length}/3 selected
        </p>
      </div>
    );
  },
  args: { options: [], value: [], onChange: () => undefined },
};

export const NoSearch: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <div className="w-64">
        <MultiSelect
          options={ACTIVITIES.slice(0, 5)}
          value={value}
          onChange={setValue}
          placeholder="Select activities…"
          showSearch={false}
        />
      </div>
    );
  },
  args: { options: [], value: [], onChange: () => undefined },
};

export const Disabled: Story = {
  render: () => (
    <div className="w-64">
      <MultiSelect
        options={ACTIVITIES}
        value={["swimming", "hiking"]}
        onChange={() => undefined}
        disabled
      />
    </div>
  ),
  args: { options: [], value: [], onChange: () => undefined },
};

export const WithDisabledOptions: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    const options = ACTIVITIES.map((o) => ({
      ...o,
      disabled: ["archery", "pottery"].includes(o.value),
    }));
    return (
      <div className="w-72">
        <MultiSelect
          options={options}
          value={value}
          onChange={setValue}
          placeholder="Some options are disabled…"
        />
      </div>
    );
  },
  args: { options: [], value: [], onChange: () => undefined },
};
