import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Tag } from "./Tag";

const meta = {
  title: "UI/Tag",
  component: Tag,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Stories ─────────────────────────────────────────────── */

export const Default: Story = {
  args: { label: "Summer camp" },
};

export const Removable: Story = {
  args: { label: "Summer camp", onRemove: () => {} },
};

export const Disabled: Story = {
  args: { label: "Disabled", disabled: true },
};

/* ── Tag list ────────────────────────────────────────────── */

const SAMPLE_TAGS = ["Arts & Crafts", "STEM", "Outdoor", "Music", "Sports"];

export const TagList: Story = {
  args: { label: "" },
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {SAMPLE_TAGS.map((label) => (
        <Tag key={label} label={label} onRemove={() => {}} />
      ))}
    </div>
  ),
};
