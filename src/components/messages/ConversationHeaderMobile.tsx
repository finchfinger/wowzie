import React from "react";
import type { Conversation } from "./messageTypes";

type Props = {
  conversation: Conversation | null;
  onBack: () => void;
  onViewCamp?: () => void;
};

export const ConversationHeaderMobile: React.FC<Props> = ({
  conversation,
  onBack,
  onViewCamp,
}) => {
  return (
    <header className="px-3 py-3 border-b border-black/5 flex items-center gap-2 bg-[#fff7f3]">
      <button
        type="button"
        onClick={onBack}
        className="shrink-0 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-gray-700"
      >
        Back
      </button>

      {conversation ? (
        <>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">
              {conversation.participant_name}
            </p>
            <p className="truncate text-[11px] text-gray-500">
              Camp messages, questions, and updates.
            </p>
          </div>

          <button
            type="button"
            onClick={onViewCamp}
            className="shrink-0 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] text-gray-700"
          >
            View
          </button>
        </>
      ) : (
        <p className="text-xs text-gray-500">No conversation selected.</p>
      )}
    </header>
  );
};
