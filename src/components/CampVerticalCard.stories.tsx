import type { Meta, StoryObj } from "@storybook/react";
import { CampVerticalCard, CampVerticalCardSkeleton } from "./CampVerticalCard";
import type { Camp } from "./CampCard";

const meta = {
  title: "Camp/CampVerticalCard",
  component: CampVerticalCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof CampVerticalCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const VIOLIN: Camp = {
  id: "1",
  slug: "junior-violin-studio",
  name: "Junior violin studio",
  hero_image_url: "https://images.unsplash.com/photo-1561154464-82e9adf32764?w=600&q=80",
  price_cents: 32900,
  listing_type: "class",
  start_time: "2026-06-08",
};

const CLIMBING: Camp = {
  id: "2",
  slug: "chicago-rocks-youth-climbing-camp",
  name: "Chicago Rocks Youth Climbing Camp",
  hero_image_url: "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=600&q=80",
  price_cents: 37500,
  listing_type: "camp",
  start_time: "2026-06-08",
};

const STARDUST: Camp = {
  id: "3",
  slug: "camp-stardust",
  name: "Camp Stardust",
  hero_image_url: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&q=80",
  price_cents: 80000,
  listing_type: "series",
  start_time: "2026-06-12",
};

const COOKING: Camp = {
  id: "4",
  slug: "chopping-block-kids-cooking-camp",
  name: "The Chopping Block Kids Cooking Camp",
  hero_image_url: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=600&q=80",
  price_cents: 65000,
  listing_type: "camp",
  start_time: "2026-06-08",
};

export const Default: Story = {
  args: { camp: VIOLIN },
};

/** ~196px — actual width in a 6-column homepage grid at 1440px */
export const AtGridWidth: Story = {
  args: { camp: VIOLIN },
  render: () => (
    <div style={{ width: 196 }}>
      <CampVerticalCard camp={VIOLIN} />
    </div>
  ),
};

export const Camp_: Story = {
  args: { camp: CLIMBING },
};

/** 2-column grid — typical homepage layout */
export const TwoColumnGrid: Story = {
  args: { camp: VIOLIN },
  render: () => (
    <div className="grid grid-cols-2 gap-4 max-w-sm">
      {[VIOLIN, CLIMBING, STARDUST, COOKING].map((c) => (
        <CampVerticalCard key={c.id} camp={c} />
      ))}
    </div>
  ),
};

/** 4-column grid — wider viewport */
export const FourColumnGrid: Story = {
  args: { camp: VIOLIN },
  render: () => (
    <div className="grid grid-cols-4 gap-4">
      {[VIOLIN, CLIMBING, STARDUST, COOKING].map((c) => (
        <CampVerticalCard key={c.id} camp={c} />
      ))}
    </div>
  ),
};

export const Skeleton: Story = {
  args: { camp: VIOLIN },
  render: () => (
    <div className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <CampVerticalCardSkeleton key={i} />
      ))}
    </div>
  ),
};

/** Compact variant — 1px smaller type, used in "Keep exploring" section */
export const Compact: Story = {
  args: { camp: VIOLIN, variant: "compact" },
};

/** Compact in a 6-column grid — mirrors the "Keep exploring" layout */
export const CompactSixColumnGrid: Story = {
  args: { camp: VIOLIN, variant: "compact" },
  render: () => (
    <div className="grid grid-cols-6 gap-4">
      {[VIOLIN, CLIMBING, STARDUST, COOKING, VIOLIN, CLIMBING].map((c, i) => (
        <CampVerticalCard key={i} camp={c} variant="compact" />
      ))}
    </div>
  ),
};
