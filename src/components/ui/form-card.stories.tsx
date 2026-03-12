import type { Meta, StoryObj } from "@storybook/react";
import { FormCard } from "./form-card";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Button } from "./button";

const meta = {
  title: "UI/FormCard",
  component: FormCard,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof FormCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Stories ─────────────────────────────────────────── */

export const Basic: Story = {
  render: () => (
    <div className="w-96">
      <FormCard title="Personal information">
        <div className="space-y-3">
          <Input placeholder="Full name" />
          <Input type="email" placeholder="Email address" />
        </div>
      </FormCard>
    </div>
  ),
  args: { title: "", children: null },
};

export const WithSubtitle: Story = {
  render: () => (
    <div className="w-96">
      <FormCard
        title="About the camp"
        subtitle="Describe what campers will experience during the week."
      >
        <Textarea
          placeholder="Write a short description…"
          className="min-h-[120px]"
        />
      </FormCard>
    </div>
  ),
  args: { title: "", children: null },
};

export const WithMultipleSections: Story = {
  render: () => (
    <div className="w-96 space-y-4">
      <FormCard title="Camp details" subtitle="Basic information about your camp.">
        <div className="space-y-3">
          <Input placeholder="Camp name" />
          <Input placeholder="Location" />
        </div>
      </FormCard>
      <FormCard title="Pricing" subtitle="Set how much families will pay.">
        <div className="space-y-3">
          <Input type="number" placeholder="Price per week ($)" />
          <Input type="number" placeholder="Early drop-off add-on ($)" />
        </div>
      </FormCard>
      <FormCard title="Contact">
        <div className="space-y-3">
          <Input type="email" placeholder="Booking contact email" />
          <Button className="w-full">Save camp</Button>
        </div>
      </FormCard>
    </div>
  ),
  args: { title: "", children: null },
};

export const EmptyState: Story = {
  render: () => (
    <div className="w-96">
      <FormCard title="Upcoming sessions" subtitle="No sessions have been added yet.">
        <p className="text-sm text-muted-foreground py-4 text-center">
          Add your first session to get started.
        </p>
        <Button variant="outline" className="w-full">
          + Add session
        </Button>
      </FormCard>
    </div>
  ),
  args: { title: "", children: null },
};
