// src/pages/host/HostGatePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Container } from "../../components/layout/Container";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Grid } from "../../components/layout/Grid";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { MediaItem } from "../../components/layout/MediaItem";

type HostStatus = "not_applied" | "pending" | "approved" | "rejected";

type HostProfileRow = {
  user_id: string;
  host_status?: HostStatus | null;
  applied_at?: string | null;
  updated_at?: string | null;
};

type Step = {
  title: string;
  body: string;
  icon?: React.ReactNode;
};

type InlineHeaderProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

const InlineHeader: React.FC<InlineHeaderProps> = ({ title, subtitle, right }) => {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {subtitle ? <p className="mt-1 text-sm text-gray-600">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
};

export const HostGatePage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<HostStatus>("not_applied");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setStatus("not_applied");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("host_profiles")
        .select("user_id, host_status, applied_at, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.warn("[HostGatePage] host_profiles read error:", error);
        setStatus("not_applied");
        setLoading(false);
        return;
      }

      const row = (data || null) as HostProfileRow | null;
      const next = (row?.host_status as HostStatus | null) || "not_applied";
      setStatus(next);
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const heroImageUrl = "/images/host-gate.jpg";

  const cta = useMemo(() => {
    if (loading) return { label: "Loading…", onClick: () => {}, disabled: true };

    if (status === "pending") {
      return { label: "Application pending", onClick: () => {}, disabled: true };
    }

    if (status === "rejected") {
      return {
        label: "Contact support",
        onClick: () => navigate("/contact"),
        disabled: false,
      };
    }

    return {
      label: "Get started",
      onClick: () => navigate("/host/apply"),
      disabled: false,
    };
  }, [loading, status, navigate]);

  // Requested icons:
  // wand-stars  -> auto_fix_high
  // event       -> event
  // star-shine  -> stars
  // waving_hand -> waving_hand
  const steps: Step[] = [
    {
      title: "Create your listing",
      body: "Add photos, set your price, choose your age group.",
      icon: <Icon name="auto_fix_high" size={18} />,
    },
    {
      title: "Pick your schedule",
      body: "Choose how guests will book",
      icon: <Icon name="event" size={18} />,
    },
    {
      title: "Make it stand out",
      body: "Add some photos plus a title and a description. We can help!",
      icon: <Icon name="stars" size={18} />,
    },
    {
      title: "Start welcoming kids",
      body: "Accept bookings and manage everything from your dashboard.",
      icon: <Icon name="waving_hand" size={18} />,
    },
  ];

  return (
    <main className="flex-1 bg-[#F5F1FF]">
      <Container className="py-10 pb-16">
        <Grid cols={12} gap="gap-8">
          <div className="col-span-12 lg:col-span-8 lg:col-start-3">
            <div className="mx-auto w-full max-w-[840px]">
              <SectionHeader
                title="Make some unforgettable experiences"
                subtitle="Explore popular activities near you, browse by category, or check out some of the great community calendars."
                actions={
                  <Button onClick={cta.onClick} disabled={cta.disabled}>
                    {cta.label}
                  </Button>
                }
              />

              {/* Image card only */}
              <div className="mt-6 rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
                <div className="aspect-[16/9] bg-gray-100">
                  <img
                    src={heroImageUrl}
                    alt="Kids doing an activity"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Page content below image, no white card */}
              <div className="mt-8">
                <InlineHeader
                  title="How it works"
                  subtitle="It’s easy to get started."
                  right={
                    <button
                      type="button"
                      onClick={() => navigate("/help")}
                      className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-800 hover:bg-gray-200 whitespace-nowrap"
                    >
                      Ask a question
                    </button>
                  }
                />

                <div className="mt-6 space-y-6">
                  {steps.map((s) => (
                    <MediaItem
                      key={s.title}
                      title={s.title}
                      body={s.body}
                      media={s.icon}
                    />
                  ))}
                </div>

                <div className="mt-8">
                  <Button onClick={cta.onClick} disabled={cta.disabled}>
                    {cta.label}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Grid>
      </Container>
    </main>
  );
};

export default HostGatePage;
