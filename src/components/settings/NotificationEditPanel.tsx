// src/components/settings/NotificationEditPanel.tsx
import React from "react";
import { ToggleSwitch } from "../ui/ToggleSwitch";

type NotificationEditPanelProps = {
  title: string;
  description: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  onEmailChange: (next: boolean) => void;
  onSmsChange: (next: boolean) => void;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
  saving?: boolean;
};

export const NotificationEditPanel: React.FC<NotificationEditPanelProps> = ({
  title,
  description,
  emailEnabled,
  smsEnabled,
  onEmailChange,
  onSmsChange,
  onCancel,
  onSave,
  saving = false,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Email</p>
            <p className="mt-0.5 text-xs text-gray-500">Send updates to your email address.</p>
          </div>
          <ToggleSwitch
            variant="switch-only"
            label="Email"
            srLabel={`${title} email notifications`}
            checked={emailEnabled}
            onChange={onEmailChange}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">SMS</p>
            <p className="mt-0.5 text-xs text-gray-500">
              Send updates by text message to your saved phone number.
            </p>
          </div>
          <ToggleSwitch
            variant="switch-only"
            label="SMS"
            srLabel={`${title} SMS notifications`}
            checked={smsEnabled}
            onChange={onSmsChange}
            disabled={saving}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
};

export default NotificationEditPanel;
