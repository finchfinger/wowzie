import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { useState } from "react";
import { SessionGroup } from "@/components/SessionGroup";
import type { SessionItem } from "@/components/SessionGroup";

const SESSIONS_FLAT: SessionItem[] = [
  { id: "1", name: "Morning", dateRange: "Jul 6 – Jul 10, 2026 · 9:00 AM – 1:00 PM" },
  { id: "2", name: "Afternoon", dateRange: "Jul 6 – Jul 10, 2026 · 1:30 PM – 4:30 PM" },
  { id: "3", name: "Evening", dateRange: "Jul 6 – Jul 10, 2026 · 5:00 PM – 8:00 PM" },
];

const SESSIONS_WITH_SPOTS: SessionItem[] = [
  { id: "1", name: "Morning", dateRange: "Jul 6 – Jul 10, 2026 · 9:00 AM – 1:00 PM", spotsRemaining: 2 },
  { id: "2", name: "Afternoon", dateRange: "Jul 6 – Jul 10, 2026 · 1:30 PM – 4:30 PM" },
];

const SESSIONS_AGES_8_10: SessionItem[] = [
  { id: "a1", name: "Morning", dateRange: "Jul 6 – Jul 10, 2026 · 9:00 AM – 1:00 PM", ageGroup: "Ages 8–10" },
  { id: "a2", name: "Afternoon", dateRange: "Aug 3 – Aug 7, 2026 · 1:30 PM – 4:30 PM", ageGroup: "Ages 8–10" },
];

const SESSIONS_AGES_13_16: SessionItem[] = [
  { id: "b1", name: "Afternoon", dateRange: "Jul 6 – Jul 10, 2026 · 1:30 PM – 4:30 PM", ageGroup: "Ages 13–16" },
];

const meta = {
  title: "Components/SessionGroup",
  component: SessionGroup,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: 420, fontFamily: "'Google Sans Text', sans-serif" }}>
        <Story />
      </div>
    ),
  ],
  args: { onToggle: fn() },
} satisfies Meta<typeof SessionGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Read-only (no leading icon) ─────────────────────────────────────────────

export const ReadOnly: Story = {
  name: "Read-only (none)",
  args: {
    items: SESSIONS_FLAT,
    selectMode: "none",
  },
};

// ─── Radio (single select) ────────────────────────────────────────────────────

export const Radio: Story = {
  name: "Radio (single select)",
  args: {
    items: SESSIONS_FLAT,
    selectMode: "radio",
    selectedIds: new Set(["1"]),
  },
};

// ─── Checkbox (multi select) ──────────────────────────────────────────────────

export const Checkbox: Story = {
  name: "Checkbox (multi select)",
  args: {
    items: SESSIONS_FLAT,
    selectMode: "checkbox",
    selectedIds: new Set(["1", "3"]),
  },
};

// ─── With spots warning ───────────────────────────────────────────────────────

export const WithSpotsWarning: Story = {
  name: "With spots warning",
  args: {
    items: SESSIONS_WITH_SPOTS,
    selectMode: "radio",
    selectedIds: new Set(["1"]),
  },
};

// ─── With age group header ────────────────────────────────────────────────────

export const WithAgeGroup: Story = {
  name: "With age group header",
  args: {
    group: "Ages 8–10",
    items: SESSIONS_AGES_8_10,
    selectMode: "none",
  },
};

// ─── Multiple groups (composed) ───────────────────────────────────────────────

export const MultipleGroups: Story = {
  name: "Multiple age groups",
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SessionGroup
        group="Ages 8–10"
        items={SESSIONS_AGES_8_10}
        selectMode="none"
      />
      <SessionGroup
        group="Ages 13–16"
        items={SESSIONS_AGES_13_16}
        selectMode="none"
      />
    </div>
  ),
};

// ─── Interactive (stateful) ───────────────────────────────────────────────────

export const Interactive: Story = {
  name: "Interactive (stateful)",
  render: () => {
    const [selected, setSelected] = useState(new Set<string>());
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SessionGroup
          group="Ages 8–10"
          items={SESSIONS_AGES_8_10}
          selectMode="radio"
          selectedIds={selected}
          onToggle={(id) => setSelected(new Set([id]))}
        />
        <SessionGroup
          group="Ages 13–16"
          items={SESSIONS_AGES_13_16}
          selectMode="radio"
          selectedIds={selected}
          onToggle={(id) => setSelected(new Set([id]))}
        />
      </div>
    );
  },
};
