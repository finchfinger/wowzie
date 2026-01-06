import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./Input";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  args: {
    placeholder: "Enter text…",
    disabled: false,
    error: false,
  },
  argTypes: {
    error: {
      control: "boolean",
    },
    disabled: {
      control: "boolean",
    },
    onChange: { action: "changed" },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {};

export const WithValue: Story = {
  args: {
    defaultValue: "Hello world",
  },
};

export const Error: Story = {
  args: {
    error: true,
    placeholder: "Something went wrong",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: "Disabled input",
  },
};
