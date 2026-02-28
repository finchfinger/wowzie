"use client";

import React, { useCallback, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImagePlus, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type PhotoItem = {
  id: string;
  src: string;
  origin: "existing" | "new";
  file?: File;
  url?: string;
};

type Props = {
  maxPhotos?: number;
  items: PhotoItem[];
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onReorder: (next: PhotoItem[]) => void;
};

const accept = { "image/*": [] as string[] };

function SortableTile({
  item,
  index,
  isPrimary,
  onRemove,
}: {
  item: PhotoItem;
  index: number;
  isPrimary: boolean;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl border border-input bg-card overflow-hidden",
        isDragging && "ring-2 ring-primary/30",
      )}
    >
      <div className="aspect-[4/3]">
        <img
          src={item.src}
          alt={`Photo ${index + 1}`}
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>

      {isPrimary ? (
        <div className="absolute left-2 top-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 border px-2 py-1 text-[11px] text-foreground">
            <Star className="h-3 w-3" />
            Primary
          </span>
        </div>
      ) : null}

      <div className="absolute right-2 top-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="rounded-lg bg-white/90 border p-2 text-foreground hover:bg-white"
          aria-label="Remove photo"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          className="rounded-lg bg-white/90 border p-2 text-foreground hover:bg-white cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function EmptyTile({
  index,
  onPick,
  disabled,
}: {
  index: number;
  onPick: (e: React.SyntheticEvent) => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className={cn(
        "aspect-[4/3] rounded-xl border border-dashed bg-card",
        "flex flex-col items-center justify-center gap-2 text-muted-foreground",
        "hover:border-primary/30 focus:outline-none focus:ring-1 focus:ring-foreground/10",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "border-border",
      )}
      aria-label={`Add photo in slot ${index + 1}`}
    >
      <ImagePlus className="h-5 w-5" />
      <span className="text-[11px] font-medium">Add photo</span>
    </button>
  );
}

function EmptyState({
  onPick,
  disabled,
}: {
  onPick: (e: React.SyntheticEvent) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="h-10 w-10 rounded-2xl bg-card border flex items-center justify-center">
        <ImagePlus className="h-5 w-5 text-muted-foreground" />
      </div>

      <p className="mt-4 text-base font-semibold text-foreground">
        Drag and drop files
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Upload at least one photo to get started. You can reorder later.
      </p>

      <button
        type="button"
        onClick={onPick}
        disabled={disabled}
        className={cn(
          "mt-4 inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-xs font-medium",
          "bg-transparent text-foreground hover:bg-gray-50",
          "focus:outline-none focus:ring-1 focus:ring-foreground/10",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        Upload from computer
      </button>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Tip: Drag a photo to the first position to make it primary.
      </p>
    </div>
  );
}

export const PhotoUploader: React.FC<Props> = ({
  maxPhotos = 8,
  items,
  onAddFiles,
  onRemove,
  onReorder,
}) => {
  const remaining = Math.max(0, maxPhotos - items.length);
  const countLabel = `${Math.min(items.length, maxPhotos)}/${maxPhotos}`;

  const drop = useDropzone({
    accept,
    multiple: true,
    maxFiles: maxPhotos,
    noClick: true,
    noKeyboard: true,
    onDrop: (files) => {
      if (!files.length) return;
      const limited = files.slice(0, remaining);
      if (!limited.length) return;
      onAddFiles(limited);
    },
  });

  const openPicker = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (remaining === 0) return;
      drop.open();
    },
    [drop, remaining],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = useMemo(() => items.map((x) => x.id), [items]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      if (active.id === over.id) return;

      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      onReorder(arrayMove(items, oldIndex, newIndex));
    },
    [items, onReorder],
  );

  const slots = useMemo(() => {
    const out: Array<
      | { kind: "filled"; item: PhotoItem; index: number }
      | { kind: "empty"; index: number }
    > = [];
    for (let i = 0; i < maxPhotos; i += 1) {
      const item = items[i];
      if (item) out.push({ kind: "filled", item, index: i });
      else out.push({ kind: "empty", index: i });
    }
    return out;
  }, [items, maxPhotos]);

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-foreground">Photos</p>
          <p className="mt-1 text-[11px] text-muted-foreground max-w-md">
            Add up to {maxPhotos} photos. Drag to reorder. The first photo
            is the primary image.
          </p>
        </div>

        <p className="text-[11px] text-muted-foreground">{countLabel}</p>
      </div>

      <div
        {...drop.getRootProps({
          onClick: (e: React.MouseEvent) => {
            e.preventDefault();
          },
        })}
        className={cn(
          "rounded-2xl border border-dashed bg-transparent p-4 transition-colors",
          drop.isDragActive ? "border-primary" : "border-border",
        )}
      >
        <input {...drop.getInputProps()} />

        {items.length === 0 ? (
          <EmptyState onPick={openPicker} disabled={remaining === 0} />
        ) : (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={ids} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {slots.map((slot) => {
                    if (slot.kind === "empty") {
                      return (
                        <EmptyTile
                          key={`empty-${slot.index}`}
                          index={slot.index}
                          onPick={openPicker}
                          disabled={remaining === 0}
                        />
                      );
                    }

                    return (
                      <SortableTile
                        key={slot.item.id}
                        item={slot.item}
                        index={slot.index}
                        isPrimary={slot.index === 0}
                        onRemove={() => onRemove(slot.item.id)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>

            <div className="mt-3 text-[11px] text-muted-foreground">
              Tip: Drag a photo to the first position to make it primary.
            </div>
          </>
        )}
      </div>
    </div>
  );
};
