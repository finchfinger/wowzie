import type { Meta, StoryObj } from "@storybook/react";
import { ActivityImageGrid } from "./ActivityImageGrid";

const meta: Meta<typeof ActivityImageGrid> = {
  title: "Camp/ActivityImageGrid",
  component: ActivityImageGrid,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof ActivityImageGrid>;

const POTTERY = [
  "https://fzdhexysoleaegzwtryf.supabase.co/storage/v1/object/public/activity-images/lillstreet/wheelthrowing.jpg",
  "https://fzdhexysoleaegzwtryf.supabase.co/storage/v1/object/public/activity-images/lillstreet/pottery_1.jpg",
  "https://fzdhexysoleaegzwtryf.supabase.co/storage/v1/object/public/activity-images/lillstreet/pottery_2.jpg",
  "https://fzdhexysoleaegzwtryf.supabase.co/storage/v1/object/public/activity-images/lillstreet/pottery_3.jpg",
  "https://fzdhexysoleaegzwtryf.supabase.co/storage/v1/object/public/activity-images/lillstreet/pottery_4.jpg",
];

export const SingleHero: Story = {
  name: "1–3 images — single hero",
  args: {
    images: POTTERY.slice(0, 1),
    alt: "Handbuilding and Wheelthrowing",
    onImageClick: (i) => console.log("clicked", i),
  },
  decorators: [(Story) => <div style={{ maxWidth: 360 }}><Story /></div>],
};

export const FourGrid: Story = {
  name: "4+ images — 2×2 grid",
  args: {
    images: POTTERY.slice(0, 4),
    alt: "Handbuilding and Wheelthrowing",
    onImageClick: (i) => console.log("clicked", i),
  },
  decorators: [(Story) => <div style={{ maxWidth: 360 }}><Story /></div>],
};
