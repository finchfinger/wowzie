import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Textarea } from "./textarea";

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Stories ─────────────────────────────────────────────── */

export const Default: Story = {
  args: { placeholder: "Write something..." },
};

export const WithValue: Story = {
  args: { defaultValue: "This is some existing content." },
};

export const Disabled: Story = {
  args: { disabled: true, placeholder: "Not editable" },
};

export const Tall: Story = {
  args: { className: "min-h-40", placeholder: "Lots of room..." },
};
