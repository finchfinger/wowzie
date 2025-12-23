// src/components/activity/ActivityGuestsPage.tsx
import React from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { ActivityOutletContext } from "../../pages/host/ActivityLayoutPage";
import { Button } from "../ui/Button";
import { ActionsMenu } from "../ui/ActionsMenu";

type Guest = {
  id: string;
  name: string;
  age: number;
  when: string;
};

const mockGuests: Guest[] = [
  { id: "g1", name: "Liam (Scott) Rodriguez", age: 7, when: "Yesterday" },
  { id: "g2", name: "Sienna Rae", age: 7, when: "Yesterday" },
  { id: "g3", name: "Jalen Wright", age: 7, when: "Yesterday" },
  { id: "g4", name: "Elodie March", age: 7, when: "Yesterday" },
  { id: "g5", name: "Noah Williams", age: 7, when: "Yesterday" },
];

export const ActivityGuestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activity, loading, error } = useOutletContext<ActivityOutletContext>();

  const header = loading
    ? "Guests"
    : activity?.name
    ? `Guests for ${activity.name}`
    : "Guests";

  return (
    <div className="space-y-4">
      {/* Optional header status (keeps this component decoupled but aware of context) */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-gray-900">{header}</h2>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {!error && !loading && activity?.id && (
            <p className="text-[11px] text-gray-500">Activity ID: {activity.id}</p>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="subtle" className="text-xs px-3 py-1.5">
            Add guest
          </Button>
          <Button variant="subtle" className="text-xs px-3 py-1.5">
            Send update
          </Button>
        </div>
      </div>

      {/* Guests list */}
      <div className="space-y-1">
        {mockGuests.map((guest) => (
          <button
            key={guest.id}
            type="button"
            onClick={() => navigate(`/host/guests/${guest.id}`)}
            className="flex w-full items-center justify-between rounded-2xl border border-violet-100 bg-white px-4 py-3 text-left text-xs hover:bg-violet-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100">
                🙂
              </div>
              <div>
                <p className="font-medium text-gray-900">{guest.name}</p>
                <p className="text-gray-500">Age {guest.age}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-gray-500">{guest.when}</span>
              <ActionsMenu
                items={[
                  {
                    label: "View guest detail",
                    onSelect: () => navigate(`/host/guests/${guest.id}`),
                  },
                  {
                    label: "Message guest",
                    onSelect: () => console.log("Message", guest.id),
                  },
                  {
                    label: "Remove guest",
                    onSelect: () => console.log("Remove", guest.id),
                  },
                ]}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ActivityGuestsPage;
