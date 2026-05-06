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
    name: "Lincoln Park Zoo Conservation Camp",
    slug: "lincoln-park-zoo-conservation-camp",
    image: "https://images.unsplash.com/photo-1472289065668-ce650ac443d2?w=1200&q=80",
  },
  {
    name: "Lillstreet Art Center Summer Camps",
    slug: "lillstreet-art-center-summer-camps",
    image: "https://images.unsplash.com/photo-1607453998774-d533f65dac99?w=800&q=80",
  },
  {
    name: "Second City Comedy Camp",
    slug: "second-city-comedy-camp",
    image: "https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80",
  },
  {
    name: "Chicago Rocks Youth Climbing Camp",
    slug: "chicago-rocks-youth-climbing-camp",
    image: "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&q=80",
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
