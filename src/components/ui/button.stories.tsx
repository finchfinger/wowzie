import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Plus } from "lucide-react";
import { Button } from "./button";

const meta = {
  title: "UI/Button",
  component: Button,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
    },
    size: {
      control: "select",
      options: ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Basic ───────────────────────────────────────────────── */

export const Default: Story = {
  args: { children: "Button" },
};

export const Disabled: Story = {
  args: { children: "Button", disabled: true, variant: "default" },
};

export const Destructive: Story = {
  args: { variant: "destructive", children: "Delete" },
};

/* ── All variants in a row ───────────────────────────────── */

const VARIANTS = ["default", "destructive", "outline", "secondary", "ghost", "link"] as const;

export const Variants: Story = {
  args: { children: "Button" },
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      {VARIANTS.map((v) => (
        <div key={v} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <Button variant={v}>Button</Button>
          <span style={{ fontSize: 11, color: "#888" }}>{v}</span>
        </div>
      ))}
    </div>
  ),
};

/* ── All sizes in a row ──────────────────────────────────── */

const TEXT_SIZES = ["xs", "sm", "default", "lg"] as const;

export const Sizes: Story = {
  args: { children: "Button" },
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      {TEXT_SIZES.map((s) => (
        <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <Button size={s}>Button</Button>
          <span style={{ fontSize: 11, color: "#888" }}>{s}</span>
        </div>
      ))}
    </div>
  ),
};

/* ── Icon stories ────────────────────────────────────────── */

export const WithIcon: Story = {
  args: { children: "Add item" },
  render: () => (
    <Button>
      <Plus />
      Add item
    </Button>
  ),
};

export const IconOnly: Story = {
  args: { size: "icon" },
  render: () => (
    <Button size="icon" aria-label="Add">
      <Plus />
    </Button>
  ),
};
