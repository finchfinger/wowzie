import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Container } from "../../components/layout/Container";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Tabs } from "../../components/ui/Tabs";
import { Button } from "../../components/ui/Button";
import type { TabItem } from "../../components/ui/Tabs";
import ShareCalendarModal from "../../components/calendar/ShareCalendarModal";

type CalendarTabId = "my" | "shared";

const CALENDAR_TABS: TabItem[] = [
  { id: "my", label: "My calendar" },
  { id: "shared", label: "Shared calendars" },
];

export const CalendarsLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);

  const getActiveTab = (): CalendarTabId => {
    const path = location.pathname;
    if (path.startsWith("/calendars/shared")) return "shared";
    return "my";
  };

  const activeTab = getActiveTab();

  const handleTabChange = (id: string) => {
    const tab = id as CalendarTabId;
    if (tab === "shared") {
      navigate("/calendars/shared");
      return;
    }
    navigate("/calendars/my");
  };

  return (
    <main className="flex-1 bg-gray-100">
      <Container className="py-6 lg:py-8">
        <SectionHeader
          title="Calendars"
          className="mb-6"
          actions={
            <Button variant="primary" onClick={() => setShareOpen(true)}>
              Share my calendar
            </Button>
          }
        />

        <Tabs
          tabs={CALENDAR_TABS}
          activeId={activeTab}
          onChange={handleTabChange}
          className="mb-6"
        />

        <Outlet />

        <ShareCalendarModal isOpen={shareOpen} onClose={() => setShareOpen(false)} />
      </Container>
    </main>
  );
};

export default CalendarsLayout;
