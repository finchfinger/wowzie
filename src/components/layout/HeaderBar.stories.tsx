import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HeaderBar } from "./HeaderBar";

const meta = {
  title: "Layout/HeaderBar",
  component: HeaderBar,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  argTypes: {
    isLoggedIn: { control: "boolean" },
    isApprovedHost: { control: "boolean" },
    isPlaying: { control: "boolean" },
    showHeaderSearch: { control: "boolean" },
    unreadCount: { control: { type: "number", min: 0, max: 99 } },
    unreadNotifCount: { control: { type: "number", min: 0, max: 99 } },
    avatarUrl: { control: "text" },
  },
} satisfies Meta<typeof HeaderBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Logged out ─────────────────────────────────────── */

export const LoggedOut: Story = {
  args: {
    isLoggedIn: false,
    showHeaderSearch: true,
  },
};

/* ── Signed in, not playing ─────────────────────────── */

export const LoggedIn: Story = {
  render: () => {
    const [playing, setPlaying] = React.useState(false);
    return (
      <HeaderBar
        isLoggedIn
        userName="Jane Smith"
        userEmail="jane@example.com"
        isApprovedHost={false}
        isPlaying={playing}
        showHeaderSearch
        onPlayToggle={() => setPlaying((p) => !p)}
      />
    );
  },
};

/* ── Playing ────────────────────────────────────────── */

export const Playing: Story = {
  render: () => {
    const [playing, setPlaying] = React.useState(true);
    return (
      <HeaderBar
        isLoggedIn
        userName="Jane Smith"
        userEmail="jane@example.com"
        isApprovedHost={false}
        isPlaying={playing}
        showHeaderSearch
        onPlayToggle={() => setPlaying((p) => !p)}
      />
    );
  },
};

/* ── Approved host ──────────────────────────────────── */

export const ApprovedHost: Story = {
  render: () => {
    const [playing, setPlaying] = React.useState(false);
    return (
      <HeaderBar
        isLoggedIn
        userName="Alex Rivera"
        userEmail="alex@camps.com"
        isApprovedHost
        isPlaying={playing}
        showHeaderSearch
        onPlayToggle={() => setPlaying((p) => !p)}
      />
    );
  },
};

/* ── Unread badges ──────────────────────────────────── */

export const WithUnread: Story = {
  render: () => {
    const [playing, setPlaying] = React.useState(false);
    return (
      <HeaderBar
        isLoggedIn
        userName="Jane Smith"
        userEmail="jane@example.com"
        isApprovedHost={false}
        isPlaying={playing}
        showHeaderSearch
        unreadCount={3}
        unreadNotifCount={7}
        onPlayToggle={() => setPlaying((p) => !p)}
      />
    );
  },
};

/* ── With avatar photo ──────────────────────────────── */

export const WithAvatar: Story = {
  render: () => {
    const [playing, setPlaying] = React.useState(false);
    return (
      <HeaderBar
        isLoggedIn
        userName="Sarah Lee"
        userEmail="sarah@example.com"
        avatarUrl="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80"
        isApprovedHost={false}
        isPlaying={playing}
        showHeaderSearch
        onPlayToggle={() => setPlaying((p) => !p)}
      />
    );
  },
};

/* ── Homepage (search hidden) ───────────────────────── */

export const HomepageHeroMode: Story = {
  args: {
    isLoggedIn: false,
    showHeaderSearch: false,
  },
  parameters: {
    docs: { description: { story: "On the homepage, search is hidden until the hero is scrolled past." } },
  },
};

/* ── Interactive controls ───────────────────────────── */

export const Playground: Story = {
  args: {
    isLoggedIn: true,
    userName: "Jordan Kim",
    userEmail: "jordan@example.com",
    isApprovedHost: false,
    isPlaying: false,
    showHeaderSearch: true,
    unreadCount: 0,
    unreadNotifCount: 0,
  },
  render: (args) => {
    const [playing, setPlaying] = React.useState(args.isPlaying ?? false);
    return (
      <HeaderBar
        {...args}
        isPlaying={playing}
        onPlayToggle={() => setPlaying((p) => !p)}
      />
    );
  },
};
