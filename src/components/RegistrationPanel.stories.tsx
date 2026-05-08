import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { RegistrationPanel, type AddonState } from "./RegistrationPanel";

const meta = {
  title: "Camp/RegistrationPanel",
  component: RegistrationPanel,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof RegistrationPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const SESSIONS = [
  { id: "s1", name: "Session 1", dateRange: "June 1–30, 2026", spotsRemaining: 4 },
  { id: "s2", name: "Session 2", dateRange: "July 1–31, 2026" },
  { id: "s3", name: "Session 3", dateRange: "August 1–29, 2026" },
];

const ADDONS = [
  { id: "early", name: "Early drop-off", priceLabel: "$10/day", priceCents: 1000, totalDays: 30 },
  { id: "extended", name: "Extended day", priceLabel: "$10/day", priceCents: 1000, totalDays: 30 },
];

const BASE = { guests: 1, maxGuests: 10, onGuestsChange: () => {} };

// Interactive wrapper for the available state
function Interactive() {
  const [guests, setGuests] = useState(1);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set(["s1"]));
  const [addonStates, setAddonStates] = useState<Record<string, AddonState>>({
    early: { selected: true, mode: "pick", daysSelected: 2 },
    extended: { selected: false, mode: "all", daysSelected: 0 },
  });

  return (
    <div style={{ maxWidth: 588 }}>
      <RegistrationPanel
        status="available"
        guests={guests}
        maxGuests={10}
        spotsRemaining={4}
        onGuestsChange={setGuests}
        sessions={SESSIONS}
        selectedSessionIds={selectedSessionIds}
        onSessionToggle={(id) =>
          setSelectedSessionIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
          })
        }
        addons={ADDONS}
        addonStates={addonStates}
        onAddonToggle={(id) =>
          setAddonStates((prev) => ({
            ...prev,
            [id]: { ...prev[id], selected: !prev[id]?.selected },
          }))
        }
        onAddonModeChange={(id, mode) =>
          setAddonStates((prev) => ({ ...prev, [id]: { ...prev[id], mode } }))
        }
        onAddonEditDays={(id) => alert(`Open day picker for ${id}`)}
        onReserve={() => alert("Reserve!")}
      />
    </div>
  );
}

export const Available: Story = { render: () => <Interactive /> };

export const Booked: Story = {
  args: {
    ...BASE,
    status: "booked",
    onInviteFriend: () => {},
    onCancelReservation: () => {},
  },
};

export const Full: Story = {
  args: {
    ...BASE,
    status: "full",
    onExploreSimilar: () => {},
  },
};

export const External: Story = {
  args: {
    ...BASE,
    status: "external",
    campName: "Knollwood Club",
    onRegisterExternal: () => {},
    onMarkGoing: () => {},
  },
};

export const Waitlist: Story = {
  args: {
    ...BASE,
    status: "waitlist",
    onJoinWaitlist: () => {},
    onExploreSimilar: () => {},
  },
};

export const Ended: Story = {
  args: {
    ...BASE,
    status: "ended",
    onExploreSimilar: () => {},
  },
};
