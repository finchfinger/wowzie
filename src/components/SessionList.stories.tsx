import type { Meta, StoryObj } from "@storybook/react";
import { SessionList } from "./SessionList";

const meta = {
  title: "Camp/SessionList",
  component: SessionList,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof SessionList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    sessions: [
      { id: "s1", name: "Morning", ageGroup: "Ages 8–12",  sessionType: "Morning",   dateRange: "June 1–30, 2026" },
      { id: "s2", name: "Morning", ageGroup: "Ages 13–16", sessionType: "Morning",   dateRange: "June 1–30, 2026" },
      { id: "s3", name: "Afternoon", ageGroup: "Ages 8–12", sessionType: "Afternoon", dateRange: "June 1–30, 2026" },
      { id: "s4", name: "Morning", ageGroup: "Ages 8–12",  sessionType: "Morning",   dateRange: "July 1–30, 2026" },
      { id: "s5", name: "Morning", ageGroup: "Ages 13–16", sessionType: "Morning",   dateRange: "July 1–30, 2026" },
      { id: "s6", name: "Afternoon", ageGroup: "Ages 8–12",  sessionType: "Afternoon", dateRange: "July 1–30, 2026" },
      { id: "s7", name: "Afternoon", ageGroup: "Ages 13–16", sessionType: "Afternoon", dateRange: "July 1–30, 2026" },
      { id: "s8", name: "All Day",   ageGroup: "Ages 8–12",  sessionType: "All Day",   dateRange: "July 1–30, 2026" },
    ],
  },
};

export const SingleSession: Story = {
  args: {
    sessions: [
      { id: "s1", name: "Morning",   ageGroup: "Ages 8–10",  sessionType: "Morning",   dateRange: "June 22 – June 26, 2026" },
      { id: "s2", name: "Afternoon", ageGroup: "Ages 8–10",  sessionType: "Afternoon", dateRange: "June 22 – June 26, 2026" },
      { id: "s3", name: "Full Day",  ageGroup: "Ages 13–16", sessionType: "Full Day",  dateRange: "June 22 – June 26, 2026" },
    ],
  },
};

export const NoAgeGroups: Story = {
  args: {
    sessions: [
      { id: "s1", name: "Morning",   sessionType: "Morning",   dateRange: "August 10 – August 14, 2026" },
      { id: "s2", name: "Afternoon", sessionType: "Afternoon", dateRange: "August 10 – August 14, 2026" },
    ],
  },
};
