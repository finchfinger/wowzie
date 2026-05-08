import type { Meta, StoryObj } from "@storybook/react";
import { CampMetaList } from "./CampMetaList";

const meta = {
  title: "Camp/CampMetaList",
  component: CampMetaList,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof CampMetaList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {
  args: {
    dateLabel: "Thursday, September 4, 2025",
    timeLabel: "8:30 AM – 11:30 AM",
    locationVenueName: "Knollwood Club",
    locationLine: "San Francisco, California",
    isVirtual: false,
    ageLabel: "Ages 3–12",
    priceLabel: "$3,000 per week",
  },
};

export const NoTime: Story = {
  args: {
    dateLabel: "Starts June 8, 2025",
    locationVenueName: "Lillstreet Art Center",
    ageLabel: "Ages 6–14",
    priceLabel: "$329 per class",
  },
};

export const Virtual: Story = {
  args: {
    dateLabel: "Every Tuesday",
    timeLabel: "4:00 PM – 5:00 PM",
    isVirtual: true,
    ageLabel: "Ages 8–12",
    priceLabel: "$75 per session",
  },
};

export const Free: Story = {
  args: {
    dateLabel: "Sunday, August 3, 2025",
    timeLabel: "9:00 AM – 12:00 PM",
    locationLine: "Grant Park, Chicago",
    priceLabel: "Free",
  },
};

export const DateOnly: Story = {
  args: {
    dateLabel: "Starts June 8, 2025",
  },
};
