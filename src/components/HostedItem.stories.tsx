import type { Meta, StoryObj } from "@storybook/react";
import { HostedItem } from "./HostedItem";

const meta = {
  title: "Camp/HostedItem",
  component: HostedItem,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof HostedItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    hostName: "Lill Street Art Center",
    hostAvatarUrl: null,
    hostProfileHref: "/profile/abc123",
    onContact: () => alert("Contact host"),
  },
};

export const WithAvatar: Story = {
  args: {
    hostName: "The Second City",
    hostAvatarUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=64&q=80",
    hostProfileHref: "/profile/abc456",
    onContact: () => alert("Contact host"),
  },
};

export const NoContact: Story = {
  args: {
    hostName: "Chicago Botanic Garden",
    hostAvatarUrl: null,
    hostProfileHref: "/profile/abc789",
  },
};
