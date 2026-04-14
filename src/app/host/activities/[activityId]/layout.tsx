"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { ActivityProvider, useActivity } from "@/lib/activity-context";
import { getHeroImage } from "@/lib/images";
import { PageHeader } from "@/components/ui/PageHeader";
import { NavTabs } from "@/components/ui/nav-tabs";
import { Button } from "@/components/ui/button";
import { ListingSkeletons } from "@/components/ui/skeleton";

/* ------------------------------------------------------------------ */
/* ActionsMenu (local — same as before)                               */
/* ------------------------------------------------------------------ */

type ActionItem = { label: string; onSelect: () => void; tone?: "default" | "destructive"; disabled?: boolean; };

function ActionsMenu({ items }: { items: ActionItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button type="button" onClick={() => setOpen(p => !p)} aria-haspopup="menu" aria-expanded={open} aria-label="More actions"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-foreground/8 text-foreground/70 hover:bg-foreground/12 hover:text-foreground transition-colors">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-popover shadow-lg z-20 overflow-hidden" role="menu">
          {items.map((item, idx) => (
            <button key={idx} type="button" role="menuitem" disabled={item.disabled}
              className={`block w-full px-3 py-2.5 text-left text-xs transition-colors ${item.disabled ? "text-muted-foreground/40 cursor-not-allowed" : item.tone === "destructive" ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-accent"}`}
              onClick={() => { if (item.disabled) return; item.onSelect(); setOpen(false); }}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DeleteModal                                                         */
/* ------------------------------------------------------------------ */

function DeleteModal({ open, title, deleting, error, onClose, onConfirm }: {
  open: boolean; title: string; deleting: boolean; error: string | null;
  onClose: () => void; onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/30" />
      <div className="relative mx-auto mt-24 w-[92%] max-w-md rounded-card bg-card p-5 shadow-lg">
        <p className="text-sm font-semibold">Delete event?</p>
        <p className="mt-1 text-xs text-muted-foreground">Permanently delete <span className="font-medium">{title}</span>. Cannot be undone.</p>
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inner shell (consumes context)                                      */
/* ------------------------------------------------------------------ */

function ActivityShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    activity, loading, error,
    pendingCount, busyAction,
    deleteOpen, deleteError, setDeleteOpen,
    handleEdit, handleDuplicate, confirmDelete,
  } = useActivity();

  const params = useParams<{ activityId: string }>();
  const activityId = params.activityId;
  const base = `/host/activities/${activityId}`;

  const tabs = [
    { id: "overview", label: "Overview", href: base },
    { id: "guests", label: "Guests", href: `${base}/guests`, badge: pendingCount || undefined },
    { id: "attendance", label: "Attendance", href: `${base}/attendance` },
    { id: "more", label: "More", href: `${base}/more` },
  ];

  const activeId = pathname.startsWith(`${base}/guests`) ? "guests"
    : pathname.startsWith(`${base}/attendance`) ? "attendance"
    : pathname.startsWith(`${base}/more`) ? "more"
    : "overview";

  if (loading) {
    return (
      <div className="page-container py-6 lg:py-8">
        <div className="page-grid">
          <div className="span-8-center">
            <ListingSkeletons count={3} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="page-container py-6 lg:py-8">
        <div className="page-grid">
          <div className="span-8-center p-6">
            <p className="text-sm text-destructive mb-4">{error || "Activity not found."}</p>
            <Button variant="outline" onClick={() => router.push("/host/listings")}>Back to listings</Button>
          </div>
        </div>
      </div>
    );
  }

  const meta = activity.meta ?? {};
  const isPublished = meta.visibility === "public" || (meta.visibility == null && activity.is_published);
  const heroUrl = getHeroImage(activity);

  return (
    <div className="page-container py-6 lg:py-8">
      <div className="page-grid">
        <div className="span-8-center">
          <PageHeader
            backHref="/host/listings"
            backLabel="Listings"
            title={activity.name}
            badge={
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${isPublished ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                {isPublished ? "Live" : "Draft"}
              </span>
            }
            mediaUrl={heroUrl}
            actions={
              <>
                <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90" onClick={handleEdit}>Edit Listing</Button>
                <ActionsMenu items={[
                  { label: "View event page", onSelect: () => { if (activity.slug) router.push(`/camp/${activity.slug}`); }, disabled: !activity.slug },
                  { label: busyAction === "duplicate" ? "Duplicating…" : "Duplicate listing", onSelect: handleDuplicate },
                  { label: "Delete event", tone: "destructive", onSelect: () => { setDeleteOpen(true); } },
                ]} />
              </>
            }
          />

          <NavTabs tabs={tabs} activeId={activeId} borderless />

          {children}

          <DeleteModal
            open={deleteOpen}
            title={activity.name}
            deleting={busyAction === "delete"}
            error={deleteError}
            onClose={() => { if (busyAction !== "delete") setDeleteOpen(false); }}
            onConfirm={confirmDelete}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Layout export                                                       */
/* ------------------------------------------------------------------ */

export default function ActivityDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ activityId: string }>();
  const activityId = params?.activityId ?? "";

  return (
    <ActivityProvider activityId={activityId}>
      <ActivityShell>{children}</ActivityShell>
    </ActivityProvider>
  );
}
