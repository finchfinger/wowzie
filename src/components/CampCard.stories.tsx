import type { Meta, StoryObj } from "@storybook/react";
import { CampCard, CampCardSkeleton } from "./CampCard";
import type { Camp } from "./CampCard";

const meta = {
  title: "Camp/CampCard",
  component: CampCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  argTypes: {
    isFavorite: { control: "boolean" },
  },
} satisfies Meta<typeof CampCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Sample data ─────────────────────────────────────── */

const BASE_CAMP: Camp = {
  id: "camp-1",
  slug: "saddle-grove-summer-camp",
  name: "Saddle & Grove Summer Camp",
  description: "A week-long adventure in the great outdoors.",
  hero_image_url: "https://images.unsplash.com/photo-1472289065668-ce650ac443d2?w=800&q=80",
  price_cents: 59900,
  listing_type: "camp",
  schedule_days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  meta: { dateLabel: "Jul 14 – Jul 18" },
};

const CLASS_CAMP: Camp = {
  id: "camp-2",
  slug: "stem-robotics-week",
  name: "STEM Robotics Week",
  hero_image_url: "https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800&q=80",
  price_cents: 34900,
  listing_type: "class",
  meta: { dateLabel: "Tuesdays, Sep–Dec" },
};

const SERIES_CAMP: Camp = {
  id: "camp-3",
  slug: "ocean-science-camp",
  name: "Ocean Science Camp",
  hero_image_url: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80",
  price_cents: 24900,
  listing_type: "series",
  schedule_days: ["Mon", "Wed", "Fri"],
  meta: { dateLabel: "8-week series" },
};

const NO_PRICE_CAMP: Camp = {
  id: "camp-4",
  slug: "community-art-workshop",
  name: "Community Art Workshop",
  hero_image_url: "https://images.unsplash.com/photo-1607453998774-d533f65dac99?w=800&q=80",
  listing_type: "camp",
};

const MULTI_IMAGE_CAMP: Camp = {
  id: "camp-5",
  slug: "cooking-adventures-camp",
  name: "Cooking Adventures Camp",
  hero_image_url: "https://images.unsplash.com/photo-1607631568010-a87245c0daf6?w=800&q=80",
  image_urls: [
    "https://images.unsplash.com/photo-1607631568010-a87245c0daf6?w=800&q=80",
    "https://images.unsplash.com/photo-1528712306091-ed0763094c98?w=800&q=80",
    "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=80",
  ],
  price_cents: 44900,
  listing_type: "camp",
  meta: { dateLabel: "Aug 4 – Aug 8" },
};

/* ── Stories ─────────────────────────────────────────── */

export const Default: Story = {
  args: {
    camp: BASE_CAMP,
    isFavorite: false,
    onToggleFavorite: () => {},
  },
};

export const Favorited: Story = {
  args: {
    camp: BASE_CAMP,
    isFavorite: true,
    onToggleFavorite: () => {},
  },
};

export const ClassListing: Story = {
  args: {
    camp: CLASS_CAMP,
    isFavorite: false,
    onToggleFavorite: () => {},
  },
};

export const SeriesListing: Story = {
  args: {
    camp: SERIES_CAMP,
    isFavorite: false,
    onToggleFavorite: () => {},
  },
};

export const NoPrice: Story = {
  args: {
    camp: NO_PRICE_CAMP,
    isFavorite: false,
    onToggleFavorite: () => {},
  },
};

export const MultipleImages: Story = {
  args: {
    camp: MULTI_IMAGE_CAMP,
    isFavorite: false,
    onToggleFavorite: () => {},
  },
};

/* ── Grid of 4 ───────────────────────────────────────── */

export const CardGrid: Story = {
  args: { camp: BASE_CAMP }, // render overrides
  parameters: { layout: "fullscreen" },
  render: () => (
    <div className="p-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
        {[BASE_CAMP, CLASS_CAMP, SERIES_CAMP, NO_PRICE_CAMP, MULTI_IMAGE_CAMP].map((camp) => (
          <CampCard
            key={camp.id}
            camp={camp}
            isFavorite={false}
            onToggleFavorite={() => {}}
          />
        ))}
      </div>
    </div>
  ),
};

/* ── Skeleton ─────────────────────────────────────────── */

export const Skeleton: Story = {
  args: { camp: BASE_CAMP }, // render overrides
  render: () => <CampCardSkeleton />,
};

export const SkeletonGrid: Story = {
  args: { camp: BASE_CAMP }, // render overrides
  parameters: { layout: "fullscreen" },
  render: () => (
    <div className="p-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <CampCardSkeleton key={i} />
        ))}
      </div>
    </div>
  ),
};
