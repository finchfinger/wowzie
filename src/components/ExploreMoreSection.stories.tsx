import type { Meta, StoryObj } from "@storybook/react";
import { ExploreMoreSection } from "./ExploreMoreSection";
import type { Camp } from "./CampCard";

const meta = {
  title: "Camp/ExploreMoreSection",
  component: ExploreMoreSection,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
} satisfies Meta<typeof ExploreMoreSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const CAMPS: Camp[] = [
  {
    id: "1",
    slug: "junior-violin-studio",
    short_id: "abc00001",
    name: "Junior violin studio",
    hero_image_url: "https://images.unsplash.com/photo-1561154464-82e9adf32764?w=600&q=80",
    price_cents: 32900,
    listing_type: "class",
    start_time: "2026-06-08",
  },
  {
    id: "2",
    slug: "chicago-rocks-youth-climbing-camp",
    short_id: "abc00002",
    name: "Chicago Rocks Youth Climbing Camp",
    hero_image_url: "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=600&q=80",
    price_cents: 37500,
    listing_type: "camp",
    start_time: "2026-06-08",
  },
  {
    id: "3",
    slug: "camp-stardust",
    short_id: "abc00003",
    name: "Camp Stardust",
    hero_image_url: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&q=80",
    price_cents: 80000,
    listing_type: "series",
    start_time: "2026-06-12",
  },
  {
    id: "4",
    slug: "chopping-block-kids-cooking-camp",
    short_id: "abc00004",
    name: "The Chopping Block Kids Cooking Camp",
    hero_image_url: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=600&q=80",
    price_cents: 65000,
    listing_type: "camp",
    start_time: "2026-06-08",
  },
  {
    id: "5",
    slug: "second-city-comedy-camp",
    short_id: "abc00005",
    name: "Second City Comedy Camp",
    hero_image_url: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&q=80",
    price_cents: 45000,
    listing_type: "camp",
    start_time: "2026-07-14",
  },
];

export const Monochrome: Story = {
  args: {
    camps: CAMPS,
    variant: "mono",
    title: "Popular activities near you",
  },
};

export const Color: Story = {
  args: {
    camps: CAMPS,
    variant: "color",
    title: "Popular activities near you",
  },
};

export const BothVariants: Story = {
  args: { camps: CAMPS, variant: "mono" },
  render: () => (
    <div>
      <ExploreMoreSection camps={CAMPS} variant="mono" title="Popular activities near you" />
      <ExploreMoreSection camps={CAMPS} variant="color" title="More near you" />
    </div>
  ),
};
