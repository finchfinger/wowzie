import type { Meta, StoryObj } from "@storybook/react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

const meta = {
  title: "UI/Select",
  component: Select,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Stories ─────────────────────────────────────────── */

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select age range" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="3-5">Ages 3–5</SelectItem>
        <SelectItem value="6-8">Ages 6–8</SelectItem>
        <SelectItem value="9-12">Ages 9–12</SelectItem>
        <SelectItem value="13+">Ages 13+</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const SmallSize: Story = {
  render: () => (
    <Select>
      <SelectTrigger size="sm" className="w-40">
        <SelectValue placeholder="Size: sm" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">Option 1</SelectItem>
        <SelectItem value="2">Option 2</SelectItem>
        <SelectItem value="3">Option 3</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithGroupsAndLabels: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Select activity type" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Outdoor</SelectLabel>
          <SelectItem value="hiking">Hiking</SelectItem>
          <SelectItem value="swimming">Swimming</SelectItem>
          <SelectItem value="horseback">Horseback riding</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Arts &amp; Crafts</SelectLabel>
          <SelectItem value="painting">Painting</SelectItem>
          <SelectItem value="pottery">Pottery</SelectItem>
          <SelectItem value="drawing">Drawing</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>STEM</SelectLabel>
          <SelectItem value="robotics">Robotics</SelectItem>
          <SelectItem value="coding">Coding</SelectItem>
          <SelectItem value="science">Science experiments</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const WithDefaultValue: Story = {
  render: () => (
    <Select defaultValue="6-8">
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="3-5">Ages 3–5</SelectItem>
        <SelectItem value="6-8">Ages 6–8</SelectItem>
        <SelectItem value="9-12">Ages 9–12</SelectItem>
        <SelectItem value="13+">Ages 13+</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select disabled>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Disabled select" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">Option 1</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const GuestsSelector: Story = {
  render: () => (
    <div className="space-y-4 w-64">
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Guests
        </label>
        <Select defaultValue="2">
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} guest{n !== 1 ? "s" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Session
        </label>
        <Select defaultValue="jul-14">
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="jul-14">July 14 – July 18</SelectItem>
            <SelectItem value="jul-21">July 21 – July 25</SelectItem>
            <SelectItem value="aug-04">August 4 – August 8</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  ),
};
