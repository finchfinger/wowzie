import type { Meta, StoryObj } from "@storybook/react";
import { Divider } from "./Divider";

const meta = {
  title: "UI/Divider",
  component: Divider,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Solid: Story = {
  args: { variant: "solid" },
};

export const Dotted: Story = {
  args: { variant: "dotted" },
};
