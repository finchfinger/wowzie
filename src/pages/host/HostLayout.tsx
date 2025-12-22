// src/pages/host/HostLayout.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Container } from "../../components/layout/Container";
import { Button } from "../../components/ui/Button";
import HostGatePage from "./HostGatePage";

type HostStatus = "not_applied" | "pending" | "approved" | "rejected";

type HostProfileRow = {
  user_id: string;
  host_status?: HostStatus | null;
};

const tabLinkClasses =
  "inline-flex items-center px-1 pb-2 text-sm border-b-2 -mb-px";
const tabInactive =
  "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300";
const tabActive = "border-violet-500 text-gray-900";

export const HostLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<HostStatus>("not_applied");

  // Keep the whole page purple while in /host
  useEffect(() => {
    const previousBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "#F5F1FF";
    return () => {
      document.body.style.backgroundColor = previousBg;
    };
  }, []);

  // Which host routes are allowed BEFORE approval
  const isAllowedPreApprovalPath = useMemo(() => {
    const p = location.pathname;
    return p === "/host" || p === "/host/apply" || p === "/host/reviewing";
  }, [location.pathname]);

  // Anything under /host/activities is treated as "no chrome" (create/edit/detail)
  const isHostActivitiesRoute = location.pathname.startsWith("/host/activities");

  // Auth + host status load
  useEffect(() => {
    let isMounted = true;

    const checkHostStatus = async () => {
      setChecking(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (userError || !user) {
        navigate("/", { replace: true });
        return;
      }

      const { data, error: hpErr } = await supabase
        .from("host_profiles")
        .select("user_id, host_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (hpErr) {
        console.warn("[HostLayout] error loading host profile:", hpErr);
        setStatus("not_applied");
        setChecking(false);

        // If they’re somewhere deep, bounce them to the gate
        if (!isAllowedPreApprovalPath) navigate("/host", { replace: true });
        return;
      }

      const row = (data || null) as HostProfileRow | null;
      const nextStatus = (row?.host_status as HostStatus | null) || "not_applied";

      setStatus(nextStatus);
      setChecking(false);

      // Not approved: only allow gate/apply/reviewing. Anything else -> /host
      if (nextStatus !== "approved" && !isAllowedPreApprovalPath) {
        navigate("/host", { replace: true });
        return;
      }

      // Approved: if they land on /host, send them to listings so the tab goes active
      if (nextStatus === "approved" && location.pathname === "/host") {
        navigate("/host/listings", { replace: true });
        return;
      }

      // Approved: if they land on apply/reviewing, send them to listings
      if (
        nextStatus === "approved" &&
        (location.pathname === "/host/apply" || location.pathname === "/host/reviewing")
      ) {
        navigate("/host/listings", { replace: true });
      }
    };

    void checkHostStatus();

    return () => {
      isMounted = false;
    };
  }, [navigate, location.pathname, isAllowedPreApprovalPath]);

  if (checking) {
    return (
      <main className="flex-1 bg-[#F5F1FF]">
        <Container className="py-8 pb-16">
          <div className="text-sm text-gray-500">Loading…</div>
        </Container>
      </main>
    );
  }

  // Pre-approval experience:
  // - /host shows the gate UI (HostGatePage)
  // - /host/apply and /host/reviewing are rendered via <Outlet />
  if (status !== "approved") {
    if (location.pathname === "/host") return <HostGatePage />;

    return (
      <main className="flex-1 bg-[#F5F1FF]">
        <Container className="py-8 pb-16">
          <Outlet />
        </Container>
      </main>
    );
  }

  // Approved host experience:
  // For host activities routes, render outlet only (no dashboard chrome)
  if (isHostActivitiesRoute) {
    return (
      <main className="flex-1 bg-[#F5F1FF]">
        <Container className="py-8 pb-16">
          <Outlet />
        </Container>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-[#F5F1FF]">
      <Container className="py-8 pb-16">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Host Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your activities, families, and payouts.
            </p>
          </div>

          <Button onClick={() => navigate("/host/activities/new")} className="text-sm">
            Create listing
          </Button>
        </header>

        <nav className="mb-6 border-b border-black/5 flex gap-6">
          <NavLink
            to="/host/listings"
            className={({ isActive }) =>
              `${tabLinkClasses} ${isActive ? tabActive : tabInactive}`
            }
          >
            Listings
          </NavLink>

          <NavLink
            to="/host/contacts"
            className={({ isActive }) =>
              `${tabLinkClasses} ${isActive ? tabActive : tabInactive}`
            }
          >
            Contacts
          </NavLink>

          <NavLink
            to="/host/financials"
            className={({ isActive }) =>
              `${tabLinkClasses} ${isActive ? tabActive : tabInactive}`
            }
          >
            Financials
          </NavLink>

          <NavLink
            to="/host/settings"
            className={({ isActive }) =>
              `${tabLinkClasses} ${isActive ? tabActive : tabInactive}`
            }
          >
            Settings
          </NavLink>
        </nav>

        <section className="mt-4">
          <Outlet />
        </section>
      </Container>
    </main>
  );
};

export default HostLayout;
