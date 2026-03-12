import type { Meta, StoryObj } from "@storybook/react";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  PopoverTrigger,
} from "./popover";
import { Button } from "./button";

const meta = {
  title: "UI/Popover",
  component: Popover,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Stories ─────────────────────────────────────────── */

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Open popover</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Quick info</PopoverTitle>
          <PopoverDescription>
            This is some helpful context shown in a floating panel.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
};

export const WithActions: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          Filter options
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <PopoverHeader>
          <PopoverTitle>Filter by age</PopoverTitle>
          <PopoverDescription>Select one or more age ranges</PopoverDescription>
        </PopoverHeader>
        <div className="mt-3 space-y-2">
          {["Ages 3–5", "Ages 6–8", "Ages 9–12", "Ages 13+"].map((label) => (
            <label key={label} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded border-border accent-foreground" />
              <span className="text-sm text-foreground">{label}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm">
            Clear
          </Button>
          <Button size="sm">Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

export const AlignStart: Story = {
  render: () => (
    <div className="flex justify-center">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Align start</Button>
        </PopoverTrigger>
        <PopoverContent align="start">
          <p className="text-sm text-muted-foreground">
            This popover is aligned to the start of the trigger.
          </p>
        </PopoverContent>
      </Popover>
    </div>
  ),
};

export const AlignEnd: Story = {
  render: () => (
    <div className="flex justify-center">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Align end</Button>
        </PopoverTrigger>
        <PopoverContent align="end">
          <p className="text-sm text-muted-foreground">
            This popover is aligned to the end of the trigger.
          </p>
        </PopoverContent>
      </Popover>
    </div>
  ),
};

export const ShareMenu: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2">
        {[
          { label: "Copy link", icon: "🔗" },
          { label: "Share via email", icon: "✉️" },
          { label: "Save to wishlist", icon: "❤️" },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors text-left"
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  ),
};
