import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Container } from "../../components/layout/Container";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Tabs } from "../../components/ui/Tabs";
import type { TabItem } from "../../components/ui/Tabs";

type CalendarTabId = "my" | "shared";

const CALENDAR_TABS: TabItem[] = [
  { id: "my", label: "My calendar" },
  { id: "shared", label: "Shared calendars" },
];

export const CalendarsLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = (): CalendarTabId => {
    const path = location.pathname;
    if (path.startsWith("/calendars/shared")) return "shared";
    return "my";
  };

  const activeTab = getActiveTab();

  const handleTabChange = (id: string) => {
    const tab = id as CalendarTabId;

    switch (tab) {
      case "shared":
        navigate("/calendars/shared");
        break;
      case "my":
      default:
        navigate("/calendars/my");
        break;
    }
  };

  return (
    <main className="flex-1 bg-gray-100">
      <Container className="py-6 lg:py-8">
        <SectionHeader
          title="Calendars"
          subtitle="Manage schedules, availability, and upcoming sessions."
          className="mb-6"
        />

        <Tabs
          tabs={CALENDAR_TABS}
          activeId={activeTab}
          onChange={handleTabChange}
          className="mb-6"
        />

        <Outlet />
      </Container>
    </main>
  );
};

export default CalendarsLayout;
