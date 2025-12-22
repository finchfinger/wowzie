// src/pages/host/ActivityGuestsPage.tsx
import React from "react";

type GuestRow = {
  id: string;
  name: string;
  ageLabel: string;
  statusLabel?: "pending" | "approved" | "declined";
  lastSeenLabel: string;
};

const DEMO_GUESTS: GuestRow[] = [
  {
    id: "1",
    name: "Liam (Scott) Rodriguez",
    ageLabel: "Age 7",
    statusLabel: "pending",
    lastSeenLabel: "Yesterday",
  },
  {
    id: "2",
    name: "Sienna Rae",
    ageLabel: "Age 7",
    lastSeenLabel: "Yesterday",
  },
  {
    id: "3",
    name: "Jalen Wright",
    ageLabel: "Age 7",
    lastSeenLabel: "Yesterday",
  },
];

export const ActivityGuestsPage: React.FC = () => {
  return (
    <section className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <button className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
          Age ▾
        </button>

        <div className="flex items-center gap-2">
          <button className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
            Add guest
          </button>
          <button className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
            Send update
          </button>
        </div>
      </div>

      {/* Guests list */}
      <div className="overflow-hidden rounded-xl border border-black/5 bg-white">
        {DEMO_GUESTS.map((guest, index) => (
          <div
            key={guest.id}
            className={`flex items-center gap-3 px-4 py-3 text-sm ${
              index !== DEMO_GUESTS.length - 1 ? "border-b border-black/5" : ""
            }`}
          >
            {/* Emoji avatar */}
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-yellow-100 text-xs">
              🙂
            </div>

            {/* Name + age */}
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-gray-900">
                {guest.name}
              </div>
              <div className="text-xs text-gray-500">{guest.ageLabel}</div>
            </div>

            {/* Approve/Decline actions for pending */}
            {guest.statusLabel === "pending" && (
              <div className="flex items-center gap-2 text-xs">
                <button className="text-red-500 hover:text-red-600">
                  Decline ✖
                </button>
                <button className="rounded-full bg-green-500 px-3 py-1 text-white hover:bg-green-600">
                  Approve ✓
                </button>
              </div>
            )}

            {/* Last updated */}
            <div className="text-xs text-gray-500">{guest.lastSeenLabel}</div>

            {/* Kebab */}
            <button className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100">
              ⋮
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
