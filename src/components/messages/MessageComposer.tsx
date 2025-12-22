import React, { useEffect, useRef, useState } from "react";
import { cx } from "./utils";

type Props = {
  active: boolean;
  placeholder: string;
  value: string;
  sending?: boolean;
  onChange: (v: string) => void;

  // attachment is passed back on send
  onSend: (e: React.FormEvent, attachment?: File | null) => void;
  enterToSend?: boolean;
};

export const MessageComposer: React.FC<Props> = ({
  active,
  placeholder,
  value,
  sending,
  onChange,
  onSend,
  enterToSend = true,
}) => {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [attachment, setAttachment] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  useEffect(() => {
    if (!attachment) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(attachment);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [attachment]);

  const pickFile = (f: File | null) => {
    if (!f) return;
    // only images for now
    if (!f.type.startsWith("image/")) return;
    setAttachment(f);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    if (!value.trim() && !attachment) return;

    onSend(e, attachment);

    setAttachment(null);
    setIsDragging(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <form
      onSubmit={submit}
      className="border-t border-black/5 bg-white px-3 sm:px-4 py-2"
      onDragEnter={(e) => {
        if (!active || sending) return;
        // Only show state when dragging files
        if (e.dataTransfer.types?.includes("Files")) setIsDragging(true);
      }}
      onDragOver={(e) => {
        if (!active || sending) return;
        // must prevent default to allow drop
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        // if leaving the form bounds
        if (e.currentTarget === e.target) setIsDragging(false);
      }}
      onDrop={(e) => {
        if (!active || sending) return;
        e.preventDefault();
        setIsDragging(false);

        const f = e.dataTransfer.files?.[0] ?? null;
        pickFile(f);
      }}
    >
      {/* Drag overlay */}
      {isDragging ? (
        <div className="mb-2 rounded-2xl border border-dashed border-black/20 bg-gray-50 px-3 py-3 text-xs text-gray-700">
          Drop an image to attach
        </div>
      ) : null}

      {/* Attachment preview */}
      {previewUrl ? (
        <div className="mb-2 flex items-center gap-2">
          <div className="h-14 w-14 overflow-hidden rounded-xl border border-black/10 bg-gray-50">
            <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-900">{attachment?.name}</p>
            <p className="text-[11px] text-gray-500">
              {(attachment?.size ? Math.round(attachment.size / 1024) : 0)} KB
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setAttachment(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            Remove
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <button
          type="button"
          disabled={!active || sending}
          onClick={() => fileRef.current?.click()}
          className={cx(
            "min-h-[44px] inline-flex w-11 items-center justify-center rounded-2xl border border-black/10 bg-white text-gray-700",
            !active || sending ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
          )}
          aria-label="Attach image"
          title="Attach image"
        >
          📎
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />

        <textarea
          ref={taRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={!active}
          onPaste={(e) => {
            if (!active || sending) return;
            const items = Array.from(e.clipboardData?.items ?? []);
            const imageItem = items.find((it) => it.type.startsWith("image/"));
            if (imageItem) {
              const file = imageItem.getAsFile();
              if (file) {
                e.preventDefault();
                pickFile(file);
              }
            }
          }}
          onKeyDown={(e) => {
            if (!enterToSend) return;
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (active && (value.trim() || attachment) && !sending) {
                (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
              }
            }
          }}
          className="flex-1 min-h-[44px] max-h-[160px] resize-none rounded-2xl border border-black/10 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-100 disabled:text-gray-400"
        />

        <button
          type="submit"
          disabled={!active || (!value.trim() && !attachment) || sending}
          className={cx(
            "min-h-[44px] inline-flex items-center justify-center rounded-2xl px-3 py-2 text-sm font-medium",
            !active || (!value.trim() && !attachment) || sending
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-gray-900 text-white hover:bg-black"
          )}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
};
