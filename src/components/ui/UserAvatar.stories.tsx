import type { Meta, StoryObj } from "@storybook/react";
import { UserAvatar } from "./UserAvatar";

const meta = {
  title: "UI/UserAvatar",
  component: UserAvatar,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    size: { control: { type: "range", min: 24, max: 96, step: 4 } },
    avatarUrl: { control: "text" },
  },
} satisfies Meta<typeof UserAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Single avatar ─────────────────────────────────────── */

export const Default: Story = {
  args: { name: "Angela Rodriguez", size: 40 },
};

export const WithPhoto: Story = {
  args: {
    name: "Angela Rodriguez",
    avatarUrl: "https://i.pravatar.cc/80?img=47",
    size: 40,
  },
};

export const Large: Story = {
  args: { name: "John Patel", size: 64 },
};

export const Small: Story = {
  args: { name: "Emma Riley", size: 28 },
};

/* ── All 10 palette colours ────────────────────────────── */

const SAMPLE_NAMES = [
  "Angela Rodriguez",  // blue
  "Ben Carter",        // amber
  "Camp Wildwood",     // emerald
  "Diana Fox",         // red
  "Ethan Moore",       // violet
  "Fiona Stein",       // pink
  "George Tan",        // teal
  "Hannah Lee",        // orange
  "Ivan Novak",        // indigo
  "Julia Marsh",       // lime
];

export const AllColours: Story = {
  args: { name: "placeholder" }, // render overrides this
  render: () => (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {SAMPLE_NAMES.map((name) => (
        <UserAvatar key={name} name={name} size={40} />
      ))}
    </div>
  ),
};

/* ── Size scale ────────────────────────────────────────── */

export const SizeScale: Story = {
  args: { name: "Rachel Kim" }, // render overrides this
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {[24, 32, 40, 48, 64, 80].map((s) => (
        <UserAvatar key={s} name="Rachel Kim" size={s} />
      ))}
    </div>
  ),
};
