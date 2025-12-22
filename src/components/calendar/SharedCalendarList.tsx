import React from "react";
import { CalendarListTile } from "./CalendarListTile";

export type SharedCalendar = {
  id: string;
  name: string;
  addedOn: string; // ISO date
  emoji?: string;
};

type Props = {
  calendars: SharedCalendar[];
  onSelectCalendar?: (id: string) => void;
};

export const SharedCalendarList: React.FC<Props> = ({
  calendars,
  onSelectCalendar,
}) => {
  if (!calendars.length) {
    return (
      <div className="flex flex-col items-center text-center py-16">
        <div className="mb-4 text-2xl">😌</div>
        <p className="text-sm font-medium text-gray-900">
          Looks a little quiet here
        </p>
        <p className="mt-1 text-sm text-gray-600 max-w-sm">
          Shared calendars will appear here once another host or parent
          gives you access.
        </p>
        <button
          type="button"
          className="mt-6 inline-flex items-center rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200"
        >
          Invite a friend
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {calendars.map((cal) => {
        const addedLabel = new Date(cal.addedOn).toLocaleDateString(
          undefined,
          {
            month: "long",
            day: "numeric",
            year: "numeric",
          }
        );

        return (
          <CalendarListTile
            key={cal.id}
            title={`${cal.name}’s calendar`}
            subtitle={`Added on ${addedLabel}`}
            iconEmoji={cal.emoji || "📌"}
            accentColor="bg-amber-100"
            onClick={() => onSelectCalendar?.(cal.id)}
            onOpenMenu={() => {
              // hook up overflow menu later
            }}
          />
        );
      })}
    </div>
  );
};
