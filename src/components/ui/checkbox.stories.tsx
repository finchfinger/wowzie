import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "./checkbox";

const meta = {
  title: "UI/Checkbox",
  component: Checkbox,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Static states ───────────────────────────────────────── */

export const Unchecked: Story = {
  args: { checked: false },
};

export const Checked: Story = {
  args: { checked: true },
};

export const Disabled: Story = {
  args: { disabled: true, checked: false },
};

export const DisabledChecked: Story = {
  args: { disabled: true, checked: true },
};

/* ── Interactive with label ──────────────────────────────── */

export const WithLabel: Story = {
  args: { id: "terms" },
  render: (args) => {
    const [checked, setChecked] = React.useState(false);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Checkbox
          {...args}
          checked={checked}
          onCheckedChange={(val) => setChecked(val === true)}
        />
        <label
          htmlFor={args.id}
          style={{ fontSize: 14, cursor: "pointer", userSelect: "none" }}
        >
          I agree to the terms and conditions
        </label>
      </div>
    );
  },
};
