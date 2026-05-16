import type { Meta, StoryObj } from "@storybook/react";
import { Alert } from "./Alert";

const meta: Meta<typeof Alert> = {
  title: "UI/Alert",
  component: Alert,
  parameters: { layout: "padded" },
  argTypes: {
    tone: {
      control: "select",
      options: ["success", "warning", "error", "dark"],
    },
    icon: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Success: Story = {
  args: {
    tone: "success",
    icon: "cheer",
    children: "You're in. We can't wait to see you!",
    action: { label: "See details", onClick: () => {} },
  },
};

export const Warning: Story = {
  args: {
    tone: "warning",
    icon: "outbound",
    children: "Registration is handled on their website.",
    action: { label: "Register now", onClick: () => {} },
  },
};

export const Error: Story = {
  args: {
    tone: "error",
    icon: "cancel",
    children: "This session is full.",
    action: { label: "Explore similar events", onClick: () => {} },
  },
};

export const Dark: Story = {
  args: {
    tone: "dark",
    icon: "event_busy",
    children: "This class has ended.",
    action: { label: "Explore similar events", onClick: () => {} },
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-xl">
      <Alert tone="success" icon="cheer" action={{ label: "See details", onClick: () => {} }}>
        You're in. We can't wait to see you!
      </Alert>
      <Alert tone="warning" icon="outbound" action={{ label: "Register now", onClick: () => {} }}>
        Registration is handled on their website.
      </Alert>
      <Alert tone="error" icon="cancel" action={{ label: "Explore similar events", onClick: () => {} }}>
        This session is full.
      </Alert>
      <Alert tone="warning" icon="list_alt" action={{ label: "Join the waitlist", onClick: () => {} }}>
        This session is full but the waitlist is open.
      </Alert>
      <Alert tone="dark" icon="event_busy" action={{ label: "Explore similar events", onClick: () => {} }}>
        This class has ended.
      </Alert>
    </div>
  ),
};
