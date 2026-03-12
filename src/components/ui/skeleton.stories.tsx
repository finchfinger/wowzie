import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton, CampCardSkeleton, RowSkeleton } from "./skeleton";

const meta = {
  title: "UI/Skeleton",
  component: Skeleton,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Stories ─────────────────────────────────────────── */

export const Base: Story = {
  render: () => (
    <div className="space-y-3 w-72">
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-5 w-1/2" />
    </div>
  ),
  args: {},
};

export const ParagraphLines: Story = {
  render: () => (
    <div className="space-y-2 w-80">
      <Skeleton className="h-6 w-2/3" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
      <Skeleton className="h-4 w-4/5" />
    </div>
  ),
  args: {},
};

export const AvatarAndText: Story = {
  render: () => (
    <div className="flex items-center gap-3 w-72">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  ),
  args: {},
};

export const CampCard: Story = {
  render: () => (
    <div className="w-64">
      <CampCardSkeleton />
    </div>
  ),
  args: {},
};

export const CampCardGrid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-[560px]">
      {Array.from({ length: 4 }).map((_, i) => (
        <CampCardSkeleton key={i} />
      ))}
    </div>
  ),
  args: {},
};

export const RowSkeletonSingle: Story = {
  render: () => (
    <div className="w-72 border border-border rounded-lg overflow-hidden divide-y divide-border">
      {Array.from({ length: 4 }).map((_, i) => (
        <RowSkeleton key={i} lines={1} />
      ))}
    </div>
  ),
  args: {},
};

export const RowSkeletonDouble: Story = {
  render: () => (
    <div className="w-72 border border-border rounded-lg overflow-hidden divide-y divide-border">
      {Array.from({ length: 3 }).map((_, i) => (
        <RowSkeleton key={i} lines={2} />
      ))}
    </div>
  ),
  args: {},
};
