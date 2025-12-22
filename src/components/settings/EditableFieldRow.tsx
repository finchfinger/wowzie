import React, { useState } from "react";

type EditableFieldRowProps = {
  label: string;
  value: string | null;
  fieldKey: string; // column in profiles
  multiline?: boolean;
  helper?: string;
  placeholder?: string;
  onSave: (fieldKey: string, newValue: string | null) => Promise<void>;
};

export const EditableFieldRow: React.FC<EditableFieldRowProps> = ({
  label,
  value,
  fieldKey,
  multiline = false,
  helper,
  placeholder,
  onSave,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(fieldKey, draft.trim() || null);
    setSaving(false);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value ?? "");
    setEditing(false);
  };

  return (
    <div className="px-4 sm:px-5 py-3 border-t border-black/5 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            {label}
          </p>

          {/* display mode */}
          {!editing && (
            <p className="mt-0.5 text-gray-900">
              {value && value.length > 0 ? (
                value
              ) : (
                <span className="text-gray-400">
                  {placeholder || "Not added"}
                </span>
              )}
            </p>
          )}

          {/* edit mode */}
          {editing && (
            <div className="mt-1 space-y-2">
              {multiline ? (
                <textarea
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                  rows={4}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
              ) : (
                <input
                  type="text"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-200 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {helper && (
            <p className="mt-0.5 text-[11px] text-gray-500">{helper}</p>
          )}
        </div>

        {!editing && (
          <button
            type="button"
            className="text-xs font-medium text-gray-700 hover:text-gray-900"
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
};
