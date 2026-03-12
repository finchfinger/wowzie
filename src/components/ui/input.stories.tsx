import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";

const meta = {
  title: "UI/Input",
  component: Input,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Stories ─────────────────────────────────────────────── */

export const Default: Story = {
  args: { placeholder: "Search..." },
};

export const WithValue: Story = {
  args: { defaultValue: "hello@example.com", type: "email" },
};

export const Password: Story = {
  args: { type: "password", placeholder: "Enter password" },
};

export const Disabled: Story = {
  args: { disabled: true, placeholder: "Disabled input" },
};

export const Error: Story = {
  args: { placeholder: "Invalid value" },
  render: (args) => (
    <Input
      {...args}
      aria-invalid="true"
      className="ring-1 ring-destructive border-destructive"
    />
  ),
};
