import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Container } from "../../components/layout/Container";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Tabs } from "../../components/ui/Tabs";
import type { TabItem } from "../../components/ui/Tabs";

type ActivitiesTabId = "upcoming" | "past" | "favorites";

const ACTIVITIES_TABS: TabItem[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "favorites", label: "Favorites" },
];

const ActivitiesLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab: ActivitiesTabId =
    location.pathname.includes("/past")
      ? "past"
      : location.pathname.includes("/favorites")
      ? "favorites"
      : "upcoming";

  const handleTabChange = (id: string) => {
    navigate(`/activities/${id as ActivitiesTabId}`);
  };

  return (
    <main className="flex-1 bg-gray-100">
      <Container className="py-6 lg:py-8">
        <SectionHeader
          title="Activities"
          subtitle="See what’s coming up, what you’ve completed, and the camps you love."
          className="mb-6"
        />

        <Tabs
          tabs={ACTIVITIES_TABS}
          activeId={activeTab}
          onChange={handleTabChange}
          className="mb-6"
        />

        <Outlet />
      </Container>
    </main>
  );
};

export default ActivitiesLayout;
