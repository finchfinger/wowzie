import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import AddressInput from "./AddressInput";

const meta = {
  title: "UI/AddressInput",
  component: AddressInput,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof AddressInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Stories ─────────────────────────────────────────── */

export const AddressMode: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <div className="w-80 space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Camp address
        </label>
        <AddressInput
          mode="address"
          value={value}
          onChange={setValue}
          placeholder="123 Main St, City, State"
          onSelect={(s) => console.log("selected:", s)}
        />
        <p className="text-xs text-muted-foreground">Value: {value || "—"}</p>
      </div>
    );
  },
  args: { mode: "address", value: "", onChange: () => undefined },
};

export const CityMode: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <div className="w-80 space-y-2">
        <label className="block text-sm font-medium text-foreground">
          City / region
        </label>
        <AddressInput
          mode="city"
          value={value}
          onChange={setValue}
          placeholder="Search for a city…"
          onSelect={(s) => console.log("city selected:", s)}
        />
        <p className="text-xs text-muted-foreground">Value: {value || "—"}</p>
      </div>
    );
  },
  args: { mode: "city", value: "", onChange: () => undefined },
};

export const WithInitialValue: Story = {
  render: () => {
    const [value, setValue] = useState("Boulder, CO, USA");
    return (
      <div className="w-80">
        <AddressInput
          mode="city"
          value={value}
          onChange={setValue}
          placeholder="Search for a city…"
        />
      </div>
    );
  },
  args: { mode: "city", value: "", onChange: () => undefined },
};
