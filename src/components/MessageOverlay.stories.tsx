import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { MessageOverlay } from "./MessageOverlay";

const meta = {
  title: "Components/MessageOverlay",
  component: MessageOverlay,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof MessageOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

function Wrapper({ avatarUrl }: { avatarUrl?: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="relative h-screen bg-background">
      <button
        className="m-8 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
        onClick={() => setOpen(true)}
      >
        Open overlay
      </button>
      <MessageOverlay
        open={open}
        recipientId="mock-id"
        recipientName="Ava Thompson"
        recipientAvatarUrl={avatarUrl}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

export const Empty: Story = {
  render: () => <Wrapper />,
  args: { open: true, recipientId: "mock", recipientName: "Ava Thompson", onClose: () => {} },
};

export const WithAvatar: Story = {
  render: () => (
    <Wrapper avatarUrl="https://i.pravatar.cc/150?img=47" />
  ),
  args: { open: true, recipientId: "mock", recipientName: "Ava Thompson", onClose: () => {} },
};

export const Closed: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div className="h-screen bg-background p-8">
        <button
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
          onClick={() => setOpen(true)}
        >
          Open overlay
        </button>
        <MessageOverlay
          open={open}
          recipientId="mock-id"
          recipientName="Ava Thompson"
          onClose={() => setOpen(false)}
        />
      </div>
    );
  },
  args: { open: false, recipientId: "mock", recipientName: "Ava Thompson", onClose: () => {} },
};
