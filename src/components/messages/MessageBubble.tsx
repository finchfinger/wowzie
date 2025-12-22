import React from "react";
import { cx } from "./utils";
import type { Message } from "./messageTypes";

type Props = { message: Message };

export const MessageBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.sender === "user";

  return (
    <div className={cx("mb-2 flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cx(
          "max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-snug",
          isUser
            ? "bg-gray-900 text-white rounded-br-sm"
            : "bg-white text-gray-900 border border-black/5 rounded-bl-sm"
        )}
      >
        {message.image_url ? (
          <a
            href={message.image_url}
            target="_blank"
            rel="noreferrer"
            className="block"
          >
            <img
              src={message.image_url}
              alt="Attachment"
              className="mb-2 max-h-[320px] w-full rounded-xl object-cover"
              loading="lazy"
            />
          </a>
        ) : null}

        {message.body ? (
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {message.body}
          </p>
        ) : null}
      </div>
    </div>
  );
};
