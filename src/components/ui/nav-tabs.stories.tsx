import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { NavTabs } from "./nav-tabs";

const meta = {
  title: "UI/NavTabs",
  component: NavTabs,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof NavTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Button mode (3 tabs) ────────────────────────────────── */

export const ButtonMode: Story = {
  args: {
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "bookings", label: "Bookings" },
      { id: "reviews", label: "Reviews" },
    ],
    activeId: "overview",
  },
  render: (args) => {
    const [activeId, setActiveId] = React.useState(args.activeId);
    return (
      <div style={{ width: 480 }}>
        <NavTabs
          tabs={args.tabs}
          activeId={activeId}
          onChange={setActiveId}
        />
        <p style={{ fontSize: 14, color: "#888", marginTop: 8 }}>
          Active tab: <strong>{activeId}</strong>
        </p>
      </div>
    );
  },
};

/* ── Four tabs ───────────────────────────────────────────── */

export const FourTabs: Story = {
  args: {
    tabs: [
      { id: "details", label: "Details" },
      { id: "schedule", label: "Schedule" },
      { id: "gallery", label: "Gallery" },
      { id: "faq", label: "FAQ" },
    ],
    activeId: "details",
  },
  render: (args) => {
    const [activeId, setActiveId] = React.useState(args.activeId);
    return (
      <div style={{ width: 560 }}>
        <NavTabs
          tabs={args.tabs}
          activeId={activeId}
          onChange={setActiveId}
        />
        <p style={{ fontSize: 14, color: "#888", marginTop: 8 }}>
          Active tab: <strong>{activeId}</strong>
        </p>
      </div>
    );
  },
};

/* ── Link mode ───────────────────────────────────────────── */

export const LinkMode: Story = {
  args: {
    tabs: [
      { id: "tab1", label: "Home", href: "#" },
      { id: "tab2", label: "Camps", href: "#" },
      { id: "tab3", label: "About", href: "#" },
    ],
    activeId: "tab1",
  },
};
