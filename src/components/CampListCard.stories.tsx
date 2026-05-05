import type { Meta, StoryObj } from "@storybook/react";
import { CampListCard, CampListCardSkeleton } from "./CampListCard";
import type { Camp } from "./CampCard";

const meta = {
  title: "Camp/CampListCard",
  component: CampListCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof CampListCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Sample data ─────────────────────────────────────── */

const RIVER_CAMP: Camp = {
  id: "1",
  slug: "river-explorers-camp",
  name: "River explorers camp",
  hero_image_url: "https://images.unsplash.com/photo-1472289065668-ce650ac443d2?w=200&q=80",
  price_cents: 32900,
  listing_type: "camp",
  schedule_days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  start_time: "2026-06-08",
  meta: { campSessions: [{}, {}, {}] },
};

const STARDUST: Camp = {
  id: "2",
  slug: "camp-stardust",
  name: "Camp Stardust",
  hero_image_url: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=200&q=80",
  price_cents: 80000,
  listing_type: "series",
  start_time: "2026-06-12",
  meta: { campSessions: [{}, {}, {}, {}] },
};

const VIOLIN: Camp = {
  id: "3",
  slug: "junior-violin-studio",
  name: "Junior violin studio",
  hero_image_url: "https://images.unsplash.com/photo-1561154464-82e9adf32764?w=200&q=80",
  price_cents: 4200,
  listing_type: "class",
  start_time: "2026-06-10",
  meta: { dateLabel: "Starts June 10 · Weekly class" },
};

const OUTWARD_BOUND: Camp = {
  id: "4",
  slug: "outward-bound-nature",
  name: "Outward Bound nature and survival skills camp",
  hero_image_url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&q=80",
  price_cents: 32900,
  listing_type: "camp",
  schedule_days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  start_time: "2026-06-08",
  end_time: "2026-08-29",
  meta: { campSessions: [{}, {}, {}] },
};

const NO_IMAGE: Camp = {
  id: "5",
  slug: "no-image-camp",
  name: "Community Art Workshop",
  price_cents: 15000,
  listing_type: "camp",
  meta: { dateLabel: "Jul 7 – Jul 11" },
};

const NO_PRICE: Camp = {
  id: "6",
  slug: "free-coding-club",
  name: "Free Coding Club",
  hero_image_url: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=200&q=80",
  listing_type: "series",
  meta: { dateLabel: "Thursdays, Jun–Aug" },
};

/* ── Stories ─────────────────────────────────────────── */

export const Default: Story = {
  args: { camp: RIVER_CAMP },
};

export const WeeklyClass: Story = {
  args: { camp: VIOLIN },
};

export const LongName: Story = {
  args: { camp: OUTWARD_BOUND },
};

export const NoImage: Story = {
  args: { camp: NO_IMAGE },
};

export const NoPrice: Story = {
  args: { camp: NO_PRICE },
};

/** How a vertical list of cards looks — closest to real homepage usage */
export const ListGroup: Story = {
  args: { camp: RIVER_CAMP },
  render: () => (
    <div className="max-w-sm divide-y divide-border">
      {[RIVER_CAMP, STARDUST, VIOLIN, OUTWARD_BOUND, NO_IMAGE, NO_PRICE].map((c) => (
        <div key={c.id} className="py-1">
          <CampListCard camp={c} />
        </div>
      ))}
    </div>
  ),
};

export const Skeleton: Story = {
  args: { camp: RIVER_CAMP },
  render: () => (
    <div className="max-w-sm divide-y divide-border">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="py-1">
          <CampListCardSkeleton />
        </div>
      ))}
    </div>
  ),
};
