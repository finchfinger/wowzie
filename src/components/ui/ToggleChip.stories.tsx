import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ToggleChip } from "./ToggleChip";

const meta = {
  title: "UI/ToggleChip",
  component: ToggleChip,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof ToggleChip>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Static states ───────────────────────────────────────── */

export const Unselected: Story = {
  args: { label: "Sports", selected: false, onToggle: () => {} },
};

export const Selected: Story = {
  args: { label: "Sports", selected: true, onToggle: () => {} },
};

export const Disabled: Story = {
  args: { label: "Sports", disabled: true, selected: false, onToggle: () => {} },
};

/* ── Filter group (mutually exclusive) ───────────────────── */

const FILTER_CHIPS = ["All", "Art", "Sports", "STEM", "Music", "Outdoor"] as const;

export const FilterGroup: Story = {
  args: { label: "", selected: false, onToggle: () => {} },
  render: () => {
    const [active, setActive] = React.useState<string>("All");
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {FILTER_CHIPS.map((chip) => (
          <ToggleChip
            key={chip}
            label={chip}
            selected={active === chip}
            onToggle={() => setActive(chip)}
          />
        ))}
      </div>
    );
  },
};
