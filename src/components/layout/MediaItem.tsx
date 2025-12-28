import React from "react";
import clsx from "clsx";

type MediaItemProps = {
  title: string;
  body: string;

  /** Icon now, image later */
  media?: React.ReactNode;

  className?: string;
};

export const MediaItem: React.FC<MediaItemProps> = ({
  title,
  body,
  media,
  className,
}) => {
  return (
    <div className={clsx("flex items-center gap-3", className)}>
      {/* Media: EXACT 20x20, no background, vertically centered to the whole text block */}
      <div className="flex h-5 w-5 shrink-0 items-center justify-center">
        {media}
      </div>

      {/* Text: both 14px, 4px between */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold leading-5 text-gray-900">{title}</p>
        <p className="text-sm leading-5 text-gray-600">{body}</p>
      </div>
    </div>
  );
};
