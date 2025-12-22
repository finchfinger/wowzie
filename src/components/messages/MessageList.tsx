import React, { useEffect, useRef } from "react";
import type { Message } from "./messageTypes";
import { MessageBubble } from "./MessageBubble";

type Props = {
  active: boolean;
  messages: Message[];
};

export const MessageList: React.FC<Props> = ({ active, messages }) => {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!active) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [active, messages.length]);

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-1">
      {active ? (
        messages.length > 0 ? (
          <>
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            <div ref={endRef} />
          </>
        ) : (
          <p className="text-xs text-gray-500">No messages yet. Say hello to your host.</p>
        )
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-xs text-gray-500">
            Select a conversation on the left to view messages.
          </p>
        </div>
      )}
    </div>
  );
};
