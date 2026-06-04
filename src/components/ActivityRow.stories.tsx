import type { Meta, StoryObj } from "@storybook/react";
import { ActivityRow } from "./ActivityRow";

const meta = {
  title: "Host/ActivityRow",
  component: ActivityRow,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ActivityRow>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleActions = [
  { label: "Go to listing",    onSelect: () => {} },
  { label: "Message guests",   onSelect: () => {} },
  { label: "Share listing",    onSelect: () => {} },
  { label: "Duplicate listing",onSelect: () => {} },
  { label: "Delete activity",  tone: "destructive" as const, separator: true, onSelect: () => {} },
];

const baseListing = {
  id: "1",
  name: "Handbuilding and Wheelthrowing",
  thumbnailUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&q=80",
  scheduleLabel: "Mon–Fri, Jun 1–Aug 28 from 9AM–4PM",
  priceLabel: "$288/session",
  enrollmentLabel: "12 of 20 spots left",
  startBadge: "Starts in 12 days",
  status: "live" as const,
  isFull: false,
};

/* ── Desktop ───────────────────────────────────────────── */

export const Desktop: Story = {
  parameters: { viewport: { defaultViewport: "desktop" } },
  render: () => (
    <div className="max-w-3xl divide-y divide-border">
      <ActivityRow listing={baseListing} actions={sampleActions} onClick={() => {}} />
      <ActivityRow listing={{ ...baseListing, id: "2", name: "Junior Violin Studio", startBadge: null, status: "in_review", enrollmentLabel: "4 of 16 spots left" }} actions={sampleActions} onClick={() => {}} />
      <ActivityRow listing={{ ...baseListing, id: "3", name: "Wild Sprout Camp", startBadge: null, status: "draft", enrollmentLabel: null }} actions={sampleActions} onClick={() => {}} />
      <ActivityRow listing={{ ...baseListing, id: "4", name: "Ceramics for Kids", startBadge: null, status: "paused", enrollmentLabel: "20 of 20 spots left", isFull: true }} actions={sampleActions} onClick={() => {}} />
    </div>
  ),
};

/* ── Mobile ────────────────────────────────────────────── */

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => (
    <div className="divide-y divide-border">
      <ActivityRow listing={baseListing} actions={sampleActions} onClick={() => {}} />
      <ActivityRow listing={{ ...baseListing, id: "2", name: "Junior Violin Studio", startBadge: null, status: "in_review", enrollmentLabel: "4 of 16 spots left" }} actions={sampleActions} onClick={() => {}} />
      <ActivityRow listing={{ ...baseListing, id: "3", name: "Wild Sprout Camp", startBadge: null, status: "draft", enrollmentLabel: null }} actions={sampleActions} onClick={() => {}} />
    </div>
  ),
};

/* ── All statuses ──────────────────────────────────────── */

export const AllStatuses: Story = {
  render: () => (
    <div className="max-w-3xl divide-y divide-border">
      {(["live", "paused", "draft", "in_review", "rejected"] as const).map((status) => (
        <ActivityRow
          key={status}
          listing={{ ...baseListing, id: status, startBadge: null, status }}
          actions={sampleActions}
          onClick={() => {}}
        />
      ))}
    </div>
  ),
};
