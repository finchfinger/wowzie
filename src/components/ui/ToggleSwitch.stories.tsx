import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ToggleSwitch } from "./ToggleSwitch";

const meta = {
  title: "UI/ToggleSwitch",
  component: ToggleSwitch,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof ToggleSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Basic interactive stories ───────────────────────────── */

export const Full: Story = {
  args: { checked: false, onChange: () => {} },
  render: () => {
    const [checked, setChecked] = React.useState(false);
    return (
      <div style={{ width: 320 }}>
        <ToggleSwitch
          checked={checked}
          onChange={setChecked}
          label="Email notifications"
          helperText="Get notified when someone books"
          variant="full"
        />
      </div>
    );
  },
};

export const SwitchOnly: Story = {
  args: { checked: false, onChange: () => {} },
  render: () => {
    const [checked, setChecked] = React.useState(false);
    return (
      <ToggleSwitch
        checked={checked}
        onChange={setChecked}
        variant="switch-only"
        srLabel="Toggle feature"
      />
    );
  },
};

export const WithHelperText: Story = {
  args: { checked: false, onChange: () => {} },
  render: () => {
    const [checked, setChecked] = React.useState(true);
    return (
      <div style={{ width: 320 }}>
        <ToggleSwitch
          checked={checked}
          onChange={setChecked}
          label="Push notifications"
          helperText="Sent to your phone"
          variant="full"
        />
      </div>
    );
  },
};

export const Disabled: Story = {
  args: {
    label: "Disabled toggle",
    checked: false,
    disabled: true,
    onChange: () => {},
    variant: "full",
  },
  render: (args) => (
    <div style={{ width: 320 }}>
      <ToggleSwitch {...args} />
    </div>
  ),
};

/* ── Settings list ───────────────────────────────────────── */

type SettingKey = "email" | "push" | "sms" | "reminders";

const SETTINGS: { key: SettingKey; label: string; helperText: string }[] = [
  { key: "email", label: "Email", helperText: "Booking confirmations and updates" },
  { key: "push", label: "Push notifications", helperText: "Sent to your device" },
  { key: "sms", label: "SMS", helperText: "Text messages for urgent alerts" },
  { key: "reminders", label: "Reminders", helperText: "Camp start date reminders" },
];

export const SettingsList: Story = {
  args: { checked: false, onChange: () => {} },
  parameters: { layout: "padded" },
  render: () => {
    const [values, setValues] = React.useState<Record<SettingKey, boolean>>({
      email: true,
      push: false,
      sms: false,
      reminders: true,
    });
    return (
      <div style={{ width: 380, display: "flex", flexDirection: "column", gap: 20 }}>
        {SETTINGS.map(({ key, label, helperText }) => (
          <ToggleSwitch
            key={key}
            checked={values[key]}
            onChange={(val) => setValues((prev) => ({ ...prev, [key]: val }))}
            label={label}
            helperText={helperText}
            variant="full"
          />
        ))}
      </div>
    );
  },
};
