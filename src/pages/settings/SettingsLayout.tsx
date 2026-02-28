// src/pages/settings/SettingsLayout.tsx
import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Tabs } from "../../components/ui/Tabs";
import type { TabItem } from "../../components/ui/Tabs";
import { Container } from "../../components/layout/Container";

type SettingsTab = "account" | "children" | "login" | "notifications";

const SETTINGS_TABS: TabItem[] = [
  { id: "account", label: "Account" },
  { id: "children", label: "Children" },
  { id: "login", label: "Security" },
  { id: "notifications", label: "Notifications" },
];

export const SettingsLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = (): SettingsTab => {
    const path = location.pathname;

    if (path === "/settings" || path === "/settings/") return "account";
    if (path.startsWith("/settings/children")) return "children";
    if (path.startsWith("/settings/child")) return "children"; // Editing a child
    if (path.startsWith("/settings/login")) return "login";
    if (path.startsWith("/settings/notifications")) return "notifications";

    return "account";
  };

  const activeTab = getActiveTab();

  const handleTabChange = (id: string) => {
    switch (id as SettingsTab) {
      case "account":
        navigate("/settings");
        break;
      case "children":
        navigate("/settings/children");
        break;
      case "login":
        navigate("/settings/login");
        break;
      case "notifications":
        navigate("/settings/notifications");
        break;
      default:
        navigate("/settings");
    }
  };

  return (
    <main className="bg-gray-50 py-10">
      <Container className="max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-xl">🍓</span>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          </div>

          <button
            type="button"
            className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
            onClick={() => navigate("/profile")}
          >
            See Profile
          </button>
        </div>

        {/* Tabs */}
        <Tabs
          tabs={SETTINGS_TABS}
          activeId={activeTab}
          onChange={handleTabChange}
          className="mb-6"
        />

        {/* Tab content area */}
        <div className="mt-6">
          <Outlet />
        </div>
      </Container>
    </main>
  );
};
