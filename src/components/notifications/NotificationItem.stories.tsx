import type { Meta, StoryObj } from "@storybook/react";
import { NotificationItem } from "./NotificationItem";
import { ContentCard } from "@/components/ui/ContentCard";
import type { NotificationData } from "./NotificationItem";

const meta = {
  title: "Notifications/NotificationItem",
  component: NotificationItem,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: {
    onToggleRead: () => {},
    onDelete: () => {},
    onApprove: () => {},
    onDecline: () => {},
    onReply: () => {},
  },
} satisfies Meta<typeof NotificationItem>;

export default meta;
type Story = StoryObj<typeof meta>;

const NOW = new Date().toISOString();

/* ── Individual types ──────────────────────────────────── */

export const BookingConfirmed: Story = {
  args: {
    notification: {
      id: "1",
      created_at: NOW,
      type: "booking_confirmed",
      is_read: false,
      meta: {
        actorName: "Angela Rodriguez",
        campName: "Saddle and Grove Summer Camp",
        childName: "Liam (Scott) Rodriguez",
      },
    },
  },
};

export const BookingConfirmedRead: Story = {
  args: {
    notification: {
      id: "2",
      created_at: NOW,
      type: "booking_confirmed",
      is_read: true,
      meta: {
        actorName: "John Patel",
        campName: "STEM Robotics Week",
        childName: "Ava Patel",
      },
    },
  },
};

export const Message: Story = {
  args: {
    notification: {
      id: "3",
      created_at: NOW,
      type: "message",
      is_read: false,
      meta: {
        actorName: "Camp Wildwood",
        campName: "Camp Wildwood",
        messageBody:
          "We can't wait to see you tomorrow. Please use the front entrance for check-in. Also, it looks like it might be a hot one. Please pack sunscreen for your little one.",
      },
    },
  },
};

export const BookingPending: Story = {
  args: {
    notification: {
      id: "4",
      created_at: NOW,
      type: "booking_pending",
      is_read: false,
      meta: {
        actorName: "Rachel Kim",
        campName: "Cooking Adventures Camp",
        childName: "Noah Kim",
        bookingId: "booking-123",
      },
    },
  },
};

export const BookingCanceled: Story = {
  args: {
    notification: {
      id: "5",
      created_at: NOW,
      type: "booking_canceled",
      is_read: true,
      meta: {
        actorName: "Emma Riley",
        campName: "Dance & Movement Camp",
        childName: "Sophie Riley",
      },
    },
  },
};

export const WithProfilePhoto: Story = {
  args: {
    notification: {
      id: "6",
      created_at: NOW,
      type: "booking_confirmed",
      is_read: false,
      meta: {
        actorName: "Marcus Webb",
        actorAvatarUrl: "https://i.pravatar.cc/80?img=12",
        campName: "Ocean Science Camp",
        childName: "Zoe Webb",
      },
    },
  },
};

/* ── Full feed inside a ContentCard ───────────────────── */

const FEED: NotificationData[] = [
  {
    id: "f1",
    created_at: NOW,
    type: "booking_confirmed",
    is_read: false,
    meta: {
      actorName: "Angela Rodriguez",
      campName: "Saddle and Grove Summer Camp",
      childName: "Liam (Scott) Rodriguez",
    },
  },
  {
    id: "f2",
    created_at: NOW,
    type: "message",
    is_read: false,
    meta: {
      actorName: "Camp Wildwood",
      campName: "Camp Wildwood",
      messageBody:
        "We can't wait to see you tomorrow. Please use the front entrance for check-in. Also, it looks like it might be a hot one. Please pack sunscreen for your little one.",
    },
  },
  {
    id: "f3",
    created_at: NOW,
    type: "booking_confirmed",
    is_read: true,
    meta: {
      actorName: "John Patel",
      campName: "STEM Robotics Week",
      childName: "Ava Patel",
    },
  },
  {
    id: "f4",
    created_at: NOW,
    type: "booking_pending",
    is_read: false,
    meta: {
      actorName: "Rachel Kim",
      campName: "Cooking Adventures Camp",
      childName: "Noah Kim",
      bookingId: "bk-mock",
    },
  },
  {
    id: "f5",
    created_at: NOW,
    type: "booking_canceled",
    is_read: true,
    meta: {
      actorName: "Emma Riley",
      campName: "Dance & Movement Camp",
      childName: "Sophie Riley",
    },
  },
];

export const FullFeed: Story = {
  args: { notification: FEED[0] }, // render overrides — satisfies required type
  parameters: { layout: "fullscreen" },
  render: ({ notification: _ignored, ...callbacks }) => (
    <div className="p-8 grid grid-cols-12 gap-6">
      <ContentCard
        title="Notifications"
        className="col-span-12 lg:col-span-8"
        actions={
          <>
            <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
              Delete all
            </button>
            <button className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground/90 transition-colors">
              Mark all as read
            </button>
          </>
        }
      >
        <div className="divide-y divide-border">
          {FEED.map((notif) => (
            <NotificationItem
              key={notif.id}
              notification={notif}
              {...callbacks}
            />
          ))}
        </div>
      </ContentCard>
    </div>
  ),
};
