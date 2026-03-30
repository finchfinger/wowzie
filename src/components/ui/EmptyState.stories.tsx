import type { Meta, StoryObj } from "@storybook/react";
import { EmptyState } from "./EmptyState";

const meta = {
  title: "UI/EmptyState",
  component: EmptyState,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Stories ───────────────────────────────────────────── */

export const Contacts: Story = {
  args: {
    icon: "child_hat",
    iconBg: "bg-yellow-300",
    iconColor: "text-yellow-900",
    title: "No contacts yet",
    description:
      "New bookings will show up here, or you can add someone manually.",
    action: { label: "Add a person", onClick: () => {} },
  },
};

export const Listings: Story = {
  args: {
    icon: "camping",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    title: "No listings yet",
    description: "Create your first activity to start accepting bookings.",
    action: { label: "Create a listing", href: "/host/activities/new" },
  },
};

export const Financials: Story = {
  args: {
    icon: "payments",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-700",
    title: "Connect your payout account",
    description:
      "Before you can receive payments from bookings, you need to connect your bank account through Stripe. This is quick, secure, and only takes a few minutes.",
    action: { label: "Connect to Stripe", onClick: () => {} },
  },
};

export const NoAction: Story = {
  name: "No action button",
  args: {
    icon: "notifications",
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    title: "You're all caught up",
    description: "No notifications right now. Check back later.",
  },
};
