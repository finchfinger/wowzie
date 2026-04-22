"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { BlockSkeletons } from "@/components/ui/skeleton";

/* ── Types ────────────────────────────────────────────────── */

type UpcomingCamp = {
  id: string;
  name: string;
  slug: string | null;
  session_start: string | null;
  session_end: string | null;
  confirmedCount: number;
  startsToday: boolean;
  isRunning: boolean;
};

type ActionItem = {
  key: string;
  icon: string;
  label: string;
  href: string;
};

type HomeData = {
  firstName: string | null;
  upcomingCamps: UpcomingCamp[];
  actionItems: ActionItem[];
  totalCamps: number;
};

/* ── Helpers ──────────────────────────────────────────────── */

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const fmtDay = () =>
  new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

const fmtSessionRange = (start: string | null, end: string | null) => {
  if (!start) return null;
  const s = new Date(`${start}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (!end || end === start) return s;
  const e = new Date(`${end}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${s} – ${e}`;
};

/* ── Page ─────────────────────────────────────────────────── */

export default function HostHomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const in7Days = new Date(today.getTime() + 7 * 86400000);
      const todayStr = today.toISOString().split("T")[0];
      const in7Str = in7Days.toISOString().split("T")[0];

      const [
        { data: profile },
        { data: camps },
        { data: unreadConvs },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("preferred_first_name, legal_name")
          .eq("id", user.id)
          .single(),
        supabase
          .from("camps")
          .select("id, name, slug, session_start, session_end, approval_status, is_published")
          .eq("host_id", user.id),
        supabase
          .from("conversations")
          .select("id, unread_count")
          .eq("user_id", user.id)
          .gt("unread_count", 0),
      ]);

      const campList = camps ?? [];
      const campIds = campList.map((c) => c.id);

      // Pending bookings for this host's camps
      const { count: pendingCount } = campIds.length
        ? await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .in("camp_id", campIds)
            .eq("status", "pending")
        : { count: 0 };

      // Confirmed counts for upcoming camps
      const upcomingRaw = campList.filter((c) => {
        if (!c.session_start) return false;
        const start = c.session_start;
        const end = c.session_end ?? c.session_start;
        // running now OR starting within 7 days
        return (start <= todayStr && end >= todayStr) || (start > todayStr && start <= in7Str);
      });

      let confirmedMap: Record<string, number> = {};
      if (upcomingRaw.length > 0) {
        const { data: confirmed } = await supabase
          .from("bookings")
          .select("camp_id")
          .in("camp_id", upcomingRaw.map((c) => c.id))
          .eq("status", "confirmed");
        for (const b of confirmed ?? []) {
          confirmedMap[b.camp_id] = (confirmedMap[b.camp_id] ?? 0) + 1;
        }
      }

      const upcomingCamps: UpcomingCamp[] = upcomingRaw
        .map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          session_start: c.session_start,
          session_end: c.session_end,
          confirmedCount: confirmedMap[c.id] ?? 0,
          startsToday: c.session_start === todayStr,
          isRunning: !!c.session_start && c.session_start < todayStr && (c.session_end ?? c.session_start) >= todayStr,
        }))
        .sort((a, b) => (a.session_start ?? "").localeCompare(b.session_start ?? ""));

      // Build action items
      const actionItems: ActionItem[] = [];

      if ((pendingCount ?? 0) > 0) {
        const n = pendingCount!;
        actionItems.push({
          key: "pending",
          icon: "pending_actions",
          label: `${n} pending booking${n !== 1 ? "s" : ""} waiting for confirmation`,
          href: "/host/bookings",
        });
      }

      const unreadTotal = (unreadConvs ?? []).reduce((s, c) => s + (c.unread_count ?? 0), 0);
      if (unreadTotal > 0) {
        actionItems.push({
          key: "messages",
          icon: "chat",
          label: `${unreadTotal} unread message${unreadTotal !== 1 ? "s" : ""} from parents`,
          href: "/messages",
        });
      }

      const inReview = campList.filter((c) => c.approval_status === "pending_review");
      if (inReview.length > 0) {
        const n = inReview.length;
        actionItems.push({
          key: "review",
          icon: "rate_review",
          label: `${n} listing${n !== 1 ? "s" : ""} pending Wowzi review`,
          href: "/host/listings",
        });
      }

      const rejected = campList.filter((c) => c.approval_status === "rejected");
      if (rejected.length > 0) {
        const n = rejected.length;
        actionItems.push({
          key: "rejected",
          icon: "cancel",
          label: `${n} listing${n !== 1 ? "s" : ""} ${n === 1 ? "was" : "were"} not approved — review feedback`,
          href: "/host/listings",
        });
      }

      const drafts = campList.filter(
        (c) => c.approval_status === "approved" && !c.is_published
      );
      if (drafts.length > 0) {
        const n = drafts.length;
        actionItems.push({
          key: "drafts",
          icon: "draft",
          label: `${n} approved listing${n !== 1 ? "s" : ""} still in draft — publish to go live`,
          href: "/host/listings",
        });
      }

      setData({
        firstName:
          (profile as any)?.preferred_first_name ||
          (profile as any)?.legal_name?.split(" ")[0] ||
          null,
        upcomingCamps,
        actionItems,
        totalCamps: campList.length,
      });
      setLoading(false);
    };

    void load();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-8 max-w-2xl">
        <div className="space-y-1">
          <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-32 rounded-lg bg-muted animate-pulse" />
        </div>
        <BlockSkeletons count={3} height="h-16" />
      </div>
    );
  }

  if (!data) return null;

  const { firstName, upcomingCamps, actionItems, totalCamps } = data;

  return (
    <div className="space-y-8 max-w-2xl">

      {/* ── Greeting ── */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground tracking-tight">
          {greeting()}{firstName ? `, ${firstName}` : ""}.
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">{fmtDay()}</p>
      </div>

      {/* ── This week ── */}
      {upcomingCamps.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            This week
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcomingCamps.map((camp) => (
              <Link
                key={camp.id}
                href={`/host/activities/${camp.id}`}
                className="group rounded-xl border border-border bg-background px-4 py-4 hover:border-primary/30 transition-colors space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                    {camp.name}
                  </p>
                  {(camp.startsToday || camp.isRunning) && (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {camp.isRunning ? "Running now" : "Starts today"}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {fmtSessionRange(camp.session_start, camp.session_end)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {camp.confirmedCount} confirmed
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Action items ── */}
      {actionItems.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Needs attention
          </p>
          <div className="rounded-xl border border-border bg-background divide-y divide-border overflow-hidden">
            {actionItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors"
              >
                <span
                  className="material-symbols-rounded shrink-0 text-amber-500 select-none"
                  style={{ fontSize: 18 }}
                >
                  {item.icon}
                </span>
                <p className="text-sm text-foreground flex-1">{item.label}</p>
                <span
                  className="material-symbols-rounded shrink-0 text-muted-foreground/50 select-none"
                  style={{ fontSize: 16 }}
                >
                  chevron_right
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Empty nudge — no listings at all ── */}
      {totalCamps === 0 && (
        <section>
          <div className="px-6 py-8 text-center space-y-3">
            <p className="text-sm font-medium text-foreground">You&apos;re all set up</p>
            <p className="text-sm text-muted-foreground">
              Create your first listing and start welcoming families.
            </p>
            <Link
              href="/host/activities/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-rounded select-none" style={{ fontSize: 16 }}>add</span>
              Create a listing
            </Link>
          </div>
        </section>
      )}

      {/* ── All clear ── */}
      {totalCamps > 0 && actionItems.length === 0 && upcomingCamps.length === 0 && (
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <span className="material-symbols-rounded text-emerald-500 select-none" style={{ fontSize: 18 }}>
            check_circle
          </span>
          You&apos;re all caught up — nothing needs attention right now.
        </div>
      )}

    </div>
  );
}
