import type { Meta, StoryObj } from "@storybook/react";
import { CampDetailHeader } from "./CampDetailHeader";

const meta = {
  title: "Camp/CampDetailHeader",
  component: CampDetailHeader,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof CampDetailHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

const metaProps = {
  dateLabel: "Thursday, September 4, 2025",
  timeLabel: "9:00 AM – 3:00 PM",
  locationVenueName: "Knollwood Club",
  locationLine: "Lake Forest, IL",
  isVirtual: false,
  ageLabel: "Ages 6–12",
  priceLabel: "$3,000 per week",
};

export const Default: Story = {
  args: {
    name: "Saddle and Grove Summer Camp",
    isFeatured: false,
    activityKind: undefined,
    isFavorite: false,
    ...metaProps,
  },
};

export const Featured: Story = {
  args: {
    name: "Saddle and Grove Summer Camp",
    isFeatured: true,
    activityKind: undefined,
    isFavorite: false,
    ...metaProps,
  },
};

export const Favorited: Story = {
  args: {
    name: "Saddle and Grove Summer Camp",
    isFeatured: true,
    activityKind: "camp",
    isFavorite: true,
    ...metaProps,
  },
};

export const FeaturedWithKind: Story = {
  args: {
    name: "Saddle and Grove Summer Camp",
    isFeatured: true,
    activityKind: "camp",
    ...metaProps,
  },
};

export const ClassKind: Story = {
  args: {
    name: "Junior Violin Studio",
    isFeatured: false,
    activityKind: "class",
    ...metaProps,
    priceLabel: "$150 per session",
  },
};

export const LongTitle: Story = {
  args: {
    name: "Lincoln Park Zoo Conservation and Wildlife Summer Camp for Young Explorers",
    isFeatured: true,
    activityKind: "camp",
    ...metaProps,
  },
};

export const Virtual: Story = {
  args: {
    name: "Online Coding Bootcamp",
    isFeatured: false,
    activityKind: "class",
    dateLabel: "Monday, June 2, 2025",
    timeLabel: "10:00 AM – 12:00 PM",
    locationVenueName: null,
    locationLine: null,
    isVirtual: true,
    ageLabel: "Ages 8–14",
    priceLabel: "$299",
  },
};
