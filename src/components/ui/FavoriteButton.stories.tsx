import type { Meta, StoryObj } from "@storybook/react";
import { FavoriteButton } from "./FavoriteButton";

const meta = {
  title: "UI/FavoriteButton",
  component: FavoriteButton,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    size: { control: "radio", options: ["sm", "md"] },
    campId: { control: "text" },
  },
} satisfies Meta<typeof FavoriteButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Stories ─────────────────────────────────────────── */

export const Default: Story = {
  args: {
    campId: "camp-demo",
    size: "md",
  },
};

export const Small: Story = {
  args: {
    campId: "camp-demo-sm",
    size: "sm",
  },
};

/* ── Both sizes on a card background ─────────────────── */

export const OnImageBackground: Story = {
  args: { campId: "camp-demo" }, // render overrides
  render: () => (
    <div className="space-y-4">
      {/* Simulated card image with button overlay */}
      <div className="relative w-64 h-64 rounded-2xl overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1472289065668-ce650ac443d2?w=600&q=80"
          alt="Camp"
          className="h-full w-full object-cover"
        />
        <div className="absolute top-3 right-3 flex gap-2">
          <FavoriteButton campId="camp-overlay-sm" size="sm" />
          <FavoriteButton campId="camp-overlay-md" size="md" />
        </div>
      </div>
      <p className="text-xs text-center text-muted-foreground">
        sm (28px) and md (36px) on an image background
      </p>
    </div>
  ),
};

/* ── Size scale ───────────────────────────────────────── */

export const SizeComparison: Story = {
  args: { campId: "camp-demo" }, // render overrides
  render: () => (
    <div className="flex items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <FavoriteButton campId="camp-sm-compare" size="sm" />
        <span className="text-xs text-muted-foreground">sm</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <FavoriteButton campId="camp-md-compare" size="md" />
        <span className="text-xs text-muted-foreground">md</span>
      </div>
    </div>
  ),
};
