import React from "react";
import { useNavigate } from "react-router-dom";
import { useActivityLayout } from "./ActivityLayoutPage";
import { Button } from "../ui/Button";
import { ActionsMenu } from "../ui/ActionsMenu";

const mockGuests = [
  { id: "g1", name: "Liam (Scott) Rodriguez", age: 7, when: "Yesterday" },
  { id: "g2", name: "Sienna Rae", age: 7, when: "Yesterday" },
  { id: "g3", name: "Jalen Wright", age: 7, when: "Yesterday" },
  { id: "g4", name: "Elodie March", age: 7, when: "Yesterday" },
  { id: "g5", name: "Noah Williams", age: 7, when: "Yesterday" },
];

export const ActivityGuestsPage: React.FC = () => {
  useActivityLayout(); // we might use this later (for activity id / name)
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700">
          <span className="mr-1 text-gray-500">↕︎</span>
          Age
        </button>
        <div className="flex gap-2">
          <Button variant="subtle" className="text-xs px-3 py-1.5">
            Add guest
          </Button>
          <Button variant="subtle" className="text-xs px-3 py-1.5">
            Send update
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        {mockGuests.map((guest) => (
          <button
            key={guest.id}
            type="button"
            onClick={() => navigate(`/host/guests/${guest.id}`)}
            className="flex w-full items-center justify-between rounded-2xl border border-violet-100 bg-white px-4 py-3 text-left text-xs hover:bg-violet-50"
          >
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-yellow-100 flex items-center justify-center">
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
