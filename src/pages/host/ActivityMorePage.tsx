// src/pages/host/ActivityMorePage.tsx
import React from "react";

export const ActivityMorePage: React.FC = () => {
  return (
    <section className="space-y-8 max-w-3xl">
      {/* Duplicate listing */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">
          Duplicate listing
        </h2>
        <p className="text-sm text-gray-600 max-w-xl">
          Create a new event with the same information as this one. Everything
          except the guest list and event blasts will be copied over.
        </p>
        <button className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
          Duplicate listing
        </button>
      </div>

      {/* Event page / URL */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Event page</h2>
        <p className="text-sm text-gray-600 max-w-xl">
          When you choose a new URL, the current one will no longer work. Do not
          change your URL if you have already shared the event.
        </p>
        <div className="flex flex-col gap-2 rounded-xl border border-black/5 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-600">
            Upgrade to Wowzie Pro to set a custom URL for this event.
          </p>
          <button className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
            Learn more
          </button>
        </div>
      </div>

      {/* Embed Event */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Embed Event</h2>
        <p className="text-sm text-gray-600 max-w-xl">
          Have your own site? Embed the event to let visitors know about it.
        </p>

        <div className="relative rounded-xl border border-black/5 bg-white p-3 text-[11px] font-mono text-gray-700">
          <button className="absolute right-3 top-3 inline-flex items-center rounded-lg border border-gray-300 bg-white px-2 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-50">
            Copy code
          </button>
          <pre className="whitespace-pre-wrap break-all">
            {`<a
  href="https://wowzie.com"
  class="wowzie-button"
  data-wowzie-action="return"
>
  Book to Wowzie
</a>

<script id="Wowzie-return" src="https://wowzie.com/embed/button.js"></script>`}
          </pre>
        </div>
      </div>

      {/* Cancel event */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-red-600">Cancel Event</h2>
        <p className="text-sm text-gray-600 max-w-xl">
          Cancel and permanently delete this event. This operation cannot be
          undone. If there are any registered guests, we will notify them that
          the event has been cancelled.
        </p>
        <button className="inline-flex items-center rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600">
          ⛔ Cancel Event
        </button>
      </div>
    </section>
  );
};
