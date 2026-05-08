import type { Meta, StoryObj } from "@storybook/react";
import { M3Carousel } from "./M3Carousel";

const meta = {
  title: "Camp/M3Carousel",
  component: M3Carousel,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
} satisfies Meta<typeof M3Carousel>;

export default meta;
type Story = StoryObj<typeof meta>;

const ITEMS = [
  {
    name: "Second City Comedy Camp",
    slug: "second-city-comedy-camp",
    image: "/images/w1.jpg",
  },
  {
    name: "Lillstreet Art Center Summer Camps",
    slug: "lillstreet-art-center-summer-camps",
    image: "/images/w2.jpg",
  },
  {
    name: "Lincoln Park Zoo Conservation Camp",
    slug: "lincoln-park-zoo-conservation-camp",
    image: "/images/w3.jpg",
  },
];

export const Default: Story = {
  args: {
    items: ITEMS,
    autoAdvance: 6000,
  },
  render: (args) => (
    <div className="p-6 bg-background">
      <M3Carousel {...args} />
    </div>
  ),
};

export const NoAutoAdvance: Story = {
  args: {
    items: ITEMS,
    autoAdvance: 0,
  },
  render: (args) => (
    <div className="p-6 bg-background">
      <M3Carousel {...args} />
    </div>
  ),
};

export const TwoItems: Story = {
  args: {
    items: ITEMS.slice(0, 2),
    autoAdvance: 0,
  },
  render: (args) => (
    <div className="p-6 bg-background">
      <M3Carousel {...args} />
    </div>
  ),
};

/** Simulated mobile viewport */
export const Mobile: Story = {
  args: {
    items: ITEMS,
    autoAdvance: 0,
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: (args) => (
    <div className="p-4 bg-background">
      <M3Carousel {...args} />
    </div>
  ),
};
