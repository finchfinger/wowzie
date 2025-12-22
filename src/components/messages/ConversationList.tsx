import React, { useMemo, useState } from "react";
import type { Conversation } from "./messageTypes";
import { ConversationRow } from "./ConversationRow";
import { formatRelativeTime } from "./utils";

type Props = {
  conversations: Conversation[];
  activeConversationId: string | null;
  loading?: boolean;
  onSelect: (id: string) => void;
};

type Filter = "all" | "unread";

export const ConversationList: React.FC<Props> = ({
  conversations,
  activeConversationId,
  loading,
  onSelect,
}) => {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const filteredConversations = useMemo(() => {
    let rows = conversations;

    if (filter === "unread") {
      rows = rows.filter((c) => (c.unread_count ?? 0) > 0);
    }

    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((c) => {
        const name = (c.participant_name ?? "").toLowerCase();
        const preview = (c.last_message_preview ?? "").toLowerCase();
        return name.includes(q) || preview.includes(q);
      });
    }

    return rows;
  }, [conversations, filter, query]);

  return (
    <section className="flex flex-col rounded-3xl border border-black/5 bg-white shadow-sm overflow-hidden">
      {/* ✅ Replace old header with filter + search */}
      <div className="px-3 py-3 border-b border-black/5 flex items-center gap-2">
        <label className="sr-only" htmlFor="conversationFilter">
          Conversation filter
        </label>
        <select
          id="conversationFilter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
          className="h-9 rounded-xl border border-black/10 bg-white px-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="all">All</option>
          <option value="unread">Unread</option>
        </select>

        <div className="flex-1 min-w-0">
          <label className="sr-only" htmlFor="conversationSearch">
            Search conversations
          </label>
          <div className="flex items-center gap-2 h-9 rounded-xl border border-black/10 bg-white px-3">
            <span className="text-gray-400">🔍</span>
            <input
              id="conversationSearch"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations"
              className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="px-4 py-3 text-xs text-gray-500">Loading conversations…</p>
        ) : filteredConversations.length === 0 ? (
          <p className="px-4 py-3 text-xs text-gray-500">
            {filter === "unread"
              ? "No unread conversations."
              : "No conversations yet."}
          </p>
        ) : (
          filteredConversations.map((c) => (
            <ConversationRow
              key={c.id}
              name={c.participant_name}
              avatar={c.avatar_emoji ?? "👋"}
              preview={c.last_message_preview}
              timeLabel={c.last_message_at ? formatRelativeTime(c.last_message_at) : ""}
              unreadCount={c.unread_count}
              active={c.id === activeConversationId}
              onClick={() => onSelect(c.id)}
            />
          ))
        )}
      </div>
    </section>
  );
};

export default ConversationList;
