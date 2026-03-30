import type { Meta, StoryObj } from "@storybook/react";
import { ContentCard } from "./ContentCard";

const meta = {
  title: "UI/ContentCard",
  component: ContentCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof ContentCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Stories ───────────────────────────────────────────── */

export const Default: Story = {
  args: {
    title: "Notifications",
    children: (
      <div className="p-5 text-sm text-muted-foreground">
        Card body goes here.
      </div>
    ),
  },
};

export const WithActions: Story = {
  args: {
    title: "Notifications",
    actions: (
      <>
        <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
          Delete all
        </button>
        <button className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground/90 transition-colors">
          Mark all as read
        </button>
      </>
    ),
    children: (
      <div className="p-5 text-sm text-muted-foreground">
        Card body goes here.
      </div>
    ),
  },
};

export const WithDescription: Story = {
  args: {
    title: "Payment history",
    description: "All your receipts in one place.",
    actions: (
      <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
        Download CSV
      </button>
    ),
    children: (
      <div className="p-5 text-sm text-muted-foreground">
        No payments yet.
      </div>
    ),
  },
};

export const NoHeader: Story = {
  args: {
    children: (
      <div className="p-5 text-sm text-muted-foreground">
        A card with no header — just a styled container.
      </div>
    ),
  },
};

export const Borderless: Story = {
  name: "Borderless (dashboard style)",
  args: {
    title: "My Listings",
    bordered: false,
    bodyClassName: "px-8 pb-8",
    children: (
      <div className="mt-4 space-y-0.5 divide-y divide-border/50">
        {["Art Camp", "Soccer Academy", "Science Explorers"].map((name) => (
          <div key={name} className="flex items-center gap-4 py-2">
            <div className="h-24 w-24 shrink-0 rounded bg-muted" />
            <div className="flex-1 space-y-1.5">
              <p className="text-sm font-semibold text-foreground">{name}</p>
              <p className="text-xs text-muted-foreground">$350 / session</p>
              <p className="text-xs text-muted-foreground">June 2 – June 6 from 9AM–3PM</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
};

export const EightColumnLayout: Story = {
  args: { children: <></> }, // render overrides — required to satisfy type
  parameters: { layout: "fullscreen" },
  render: () => (
    <div className="p-8 grid grid-cols-12 gap-6">
      <ContentCard
        title="8 of 12 columns"
        description="This is how ContentCard sits in a 12-col page grid."
        className="col-span-12 lg:col-span-8"
        actions={
          <button className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background">
            Action
          </button>
        }
      >
        <div className="p-5 text-sm text-muted-foreground">Content area</div>
      </ContentCard>
    </div>
  ),
};
