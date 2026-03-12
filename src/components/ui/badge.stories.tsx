import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Star } from "lucide-react";
import { Badge } from "./badge";

const meta = {
  title: "UI/Badge",
  component: Badge,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline", "ghost", "link"],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Basic ───────────────────────────────────────────────── */

export const Default: Story = {
  args: { children: "Badge" },
};

/* ── All variants in a row ───────────────────────────────── */

const VARIANTS = ["default", "secondary", "destructive", "outline", "ghost", "link"] as const;

export const AllVariants: Story = {
  args: { children: "" },
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      {VARIANTS.map((v) => (
        <div key={v} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <Badge variant={v}>Badge</Badge>
          <span style={{ fontSize: 11, color: "#888" }}>{v}</span>
        </div>
      ))}
    </div>
  ),
};

/* ── With icon ───────────────────────────────────────────── */

export const WithIcon: Story = {
  args: { children: "Badge" },
  render: () => (
    <Badge>
      <Star />
      Featured
    </Badge>
  ),
};
