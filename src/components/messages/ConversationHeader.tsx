import React from "react";
import { Link } from "react-router-dom";
import type { Conversation } from "./messageTypes";

type Props = {
  conversation: Conversation | null;
  onViewCamp?: () => void; // keep if you still want a button callback
};

export const ConversationHeader: React.FC<Props> = ({ conversation }) => {
  if (!conversation) {
    return (
      <header className="px-4 py-3 border-b border-black/5">
        <p className="text-xs text-gray-500">Choose a conversation to start messaging.</p>
      </header>
    );
  }

  const profileHref = conversation.participant_profile_id
    ? `/profile/${conversation.participant_profile_id}`
    : null;

  const campHref = conversation.camp_slug ? `/camp/${conversation.camp_slug}` : null;

  return (
    <header className="px-4 py-3 border-b border-black/5 flex items-center justify-between bg-[#fff7f3]">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shrink-0">
          {conversation.avatar_emoji ?? "👋"}
        </div>

        <div className="min-w-0">
          {profileHref ? (
            <Link
              to={profileHref}
              className="block text-sm font-semibold text-gray-900 hover:underline truncate"
            >
              {conversation.participant_name}
            </Link>
          ) : (
            <p className="text-sm font-semibold text-gray-900 truncate">
              {conversation.participant_name}
            </p>
          )}

          <p className="text-[11px] text-gray-500 truncate">
            Camp messages, questions, and updates.
          </p>
        </div>
      </div>

      {campHref ? (
        <Link
          to={campHref}
          className="shrink-0 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] text-gray-700 hover:bg-gray-50"
        >
          View camp
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="shrink-0 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] text-gray-400 cursor-not-allowed"
        >
          View camp
        </button>
      )}
    </header>
  );
};

export default ConversationHeader;
