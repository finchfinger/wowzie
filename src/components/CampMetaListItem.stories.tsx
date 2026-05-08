import type { Meta, StoryObj } from "@storybook/react";
import { CampMetaListItem } from "./CampMetaList";

const SAMPLE_DESCRIPTION = "8:30 AM – 11:30 AM";

const meta = {
  title: "Camp/CampMetaListItem",
  component: CampMetaListItem,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  argTypes: {
    description: {
      control: "boolean",
      mapping: { true: SAMPLE_DESCRIPTION, false: undefined },
    },
  },
} satisfies Meta<typeof CampMetaListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Date_: Story = {
  args: {
    icon: "event",
    primary: "Thursday, September 4, 2025",
    description: false,
  },
};

export const DateWithTime: Story = {
  args: {
    icon: "event",
    primary: "Thursday, September 4, 2025",
    description: true,
  },
};

export const Location: Story = {
  args: {
    icon: "assistant_navigation",
    primary: "Knollwood Club",
    description: false,
  },
};

export const Price: Story = {
  args: {
    icon: "paid",
    primary: "$3,000 per week",
    description: false,
  },
};

export const Ages: Story = {
  args: {
    icon: "mood",
    primary: "Ages 3–12",
    description: false,
  },
};
