"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { uploadActivityImages } from "@/lib/images";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DateInput } from "@/components/ui/DateInput";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { AddressInput } from "@/components/ui/AddressInput";
import { FormCard } from "@/components/ui/form-card";
import { Alert } from "@/components/ui/Alert";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import {
  PhotoUploader,
  type PhotoItem,
} from "@/components/host/PhotoUploader";
import { CalendarDays } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type Visibility = "private" | "public";
type ActivityType = "fixed" | "ongoing";
type ActivityKind = "camp" | "class";
type LocationType = "in_person" | "virtual";
type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
type DaySchedule = { start: string; end: string };
type SiblingDiscountType = "none" | "percent" | "amount";
type AgeBucket = "all" | "3-5" | "6-8" | "9-12" | "13+";
type ExperienceLevel = "beginner" | "intermediate" | "advanced" | "all_levels";
type ClassScheduleMode = "ongoing" | "sessions";
type DateEntryMode = "range" | "individual";
type EnrollmentMode = "full_program" | "choose_sessions";
type ClassFrequency =
  | "once_week"
  | "twice_week"
  | "three_week"
  | "multiple_week"
  | "daily"
  | "flexible";

/** A single time block within a day (classes can have multiple per day) */
type TimeBlock = { id: string; start: string; end: string };

/** Weekly availability for classes: each day has 0+ time blocks or is unavailable */
type ClassDaySchedule = { available: boolean; blocks: TimeBlock[] };
type ClassWeeklySchedule = Record<DayKey, ClassDaySchedule>;

/** A single camp session (camps can have multiple sessions) */
type CampSession = {
  id: string;
  label: string;              // optional host-defined name, e.g. "Week 1" or "Beginner Track"
  startDate: string;
  endDate: string;
  days: DayKey[];             // which days of the week this session runs
  startTime: string;
  endTime: string;
  capacity: string;
  enableWaitlist: boolean;
  price_cents: number | null; // persisted per-session price
  priceText: string;          // UI-only shadow, stripped at save
  experienceLevel: ExperienceLevel[];
};

/** A class session section (day + capacity + time) for sessions mode */
type ClassSessionSection = {
  id: string;
  day: DayKey | "";
  capacity: string;
  startTime: string;
  endTime: string;
};

type ActivityItem = {
  id: string;
  title: string;
  description: string;
};

type CampMeta = {
  visibility?: Visibility;
  isVirtual?: boolean;
  meetingUrl?: string;
  activityType?: ActivityType;
  activityKind?: ActivityKind;
  experienceLevel?: ExperienceLevel[];
  category?: string;
  cancellation_policy?: string | null;
  additionalDetails?: string;
  age_buckets?: AgeBucket[];
  age_bucket?: AgeBucket;
  min_age?: number | null;
  max_age?: number | null;
  fixedSchedule?: {
    startDate?: string | null;
    endDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    allDay?: boolean;
    repeatRule?: string;
  };
  ongoingSchedule?: {
    startDate?: string | null;
    endDate?: string | null;
  };
  weeklySchedule?: Record<DayKey, DaySchedule>;
  campSessions?: CampSession[];
  classSchedule?: {
    mode?: ClassScheduleMode;
    weekly?: ClassWeeklySchedule;
    duration?: string;
    studentsPerClass?: string;
    pricePerClass?: string;
    frequency?: ClassFrequency;
    sessionLength?: string;
    sessionEndDate?: string;
    meetingLength?: string;
    sessionStartDate?: string;
    pricePerMeeting?: string;
    sections?: ClassSessionSection[];
  };
  advanced?: {
    earlyDropoff?: {
      enabled?: boolean;
      price?: string | null;
      start?: string | null;
      end?: string | null;
    };
    extendedDay?: {
      enabled?: boolean;
      price?: string | null;
      start?: string | null;
      end?: string | null;
    };
    siblingDiscount?: {
      enabled?: boolean;
      type?: SiblingDiscountType;
      value?: string | null;
      price?: string | null;
    };
    multiSessionDiscount?: {
      enabled?: boolean;
      percent?: string | null;
    };
    customAddOns?: Array<{ id: string; name: string; price: string }>;
  };
  pricing?: {
    price_cents?: number | null;
    display?: string | null;
    currency?: string;
  };
  activities?: ActivityItem[];
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const pad2 = (n: number) => String(n).padStart(2, "0");

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const toAmPmLabel = (valueHHMM: string) => {
  const [hhRaw, mmRaw] = valueHHMM.split(":");
  const hh = Number.parseInt(hhRaw ?? "", 10);
  const mm = Number.parseInt(mmRaw ?? "", 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return valueHHMM;
  const suffix = hh >= 12 ? "pm" : "am";
  const hh12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hh12}:${pad2(mm)}${suffix}`;
};

const TIME_OPTIONS = (() => {
  const opts: Array<{ value: string; label: string }> = [];
  for (let m = 0; m < 24 * 60; m += 15) {
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    const value = `${pad2(hh)}:${pad2(mm)}`;
    opts.push({ value, label: toAmPmLabel(value) });
  }
  return opts;
})();

/** Parse a typed string like "9am", "9:30", "930", "14:00" → "HH:MM" or null */
function parseTypedTime(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/\s/g, "");
  if (!s) return null;
  const ampm = s.endsWith("am") ? "am" : s.endsWith("pm") ? "pm" : null;
  const digits = s.replace(/[^0-9:]/g, "");
  let hh: number, mm: number;
  if (digits.includes(":")) {
    const [a, b] = digits.split(":");
    hh = Number(a); mm = Number(b ?? "0");
  } else if (digits.length <= 2) {
    hh = Number(digits); mm = 0;
  } else {
    hh = Number(digits.slice(0, digits.length - 2));
    mm = Number(digits.slice(-2));
  }
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  if (ampm === "pm" && hh < 12) hh += 12;
  if (ampm === "am" && hh === 12) hh = 0;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return `${pad2(hh)}:${pad2(mm)}`;
}

function TimeSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayLabel = value ? toAmPmLabel(value) : "";

  const filtered = useMemo(() => {
    if (!inputText) return TIME_OPTIONS;
    const q = inputText.toLowerCase().replace(/\s/g, "");
    return TIME_OPTIONS.filter((o) => o.label.replace(/\s/g, "").startsWith(q) || o.label.replace(/\s/g, "").includes(q));
  }, [inputText]);

  // Scroll selected item (or 9am fallback) into view when dropdown opens
  useEffect(() => {
    if (open && listRef.current) {
      const target = value || "09:00";
      const idx = TIME_OPTIONS.findIndex((o) => o.value === target);
      if (idx >= 0) {
        const item = listRef.current.children[idx] as HTMLElement | undefined;
        item?.scrollIntoView({ block: "nearest" });
      }
    }
  }, [open, value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
    setInputText("");
  };

  const handleBlur = () => {
    // Try to parse whatever the user typed
    if (inputText) {
      const parsed = parseTypedTime(inputText);
      if (parsed) onChange(parsed);
    }
    setInputText("");
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        disabled={disabled}
        value={open ? inputText : displayLabel}
        placeholder="Add time"
        onFocus={() => { setOpen(true); setInputText(""); }}
        onChange={(e) => setInputText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setOpen(false); setInputText(""); }
          if (e.key === "Enter" && filtered.length > 0) { e.preventDefault(); select(filtered[0]!.value); }
        }}
        className="h-11 w-full rounded bg-[#f1f3f4] border-0 px-3 text-sm outline-none transition-colors hover:bg-[#e8eaed] focus:ring-2 focus:ring-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {open && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-52 w-40 overflow-y-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5 text-sm"
          onMouseDown={(e) => e.preventDefault()} // keep input focused
        >
          {filtered.map((opt) => (
            <li
              key={opt.value}
              onClick={() => select(opt.value)}
              className={`cursor-pointer px-4 py-1.5 ${opt.value === value ? "bg-[#e8eaed] font-medium" : "hover:bg-[#f1f3f4]"}`}
            >
              {opt.label}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-2 text-muted-foreground">No results</li>
          )}
        </ul>
      )}
    </div>
  );
}

const CANCELLATION_OPTIONS: Array<{
  value: string;
  label: string;
  helper: string;
}> = [
  {
    value: "Cancel at least 1 hour before the start time for a full refund.",
    label: "1 hour",
    helper: "Full refund up to 1 hour before start time. Good for drop-in classes.",
  },
  {
    value: "Cancel at least 1 day before the start time for a full refund.",
    label: "24 hours",
    helper: "Full refund up to 24 hours before start time.",
  },
  {
    value: "Cancel at least 2 days before the start time for a full refund.",
    label: "48 hours",
    helper: "Full refund up to 48 hours before start time.",
  },
  {
    value: "Cancel at least 7 days before the start time for a full refund.",
    label: "7 days",
    helper: "Full refund up to 7 days before start time.",
  },
  {
    value: "Cancel at least 14 days before the start time for a full refund.",
    label: "14 days",
    helper: "Full refund up to 14 days before start time.",
  },
  {
    value: "Cancel at least 30 days before the start time for a full refund.",
    label: "30 days",
    helper: "Full refund up to 30 days before start time. Good for multi-week programs.",
  },
  {
    value:
      "All sales are final. If you can't attend, message the host to ask about a credit or transfer.",
    label: "No refunds",
    helper: "All sales final. Hosts may offer credits or transfers at their discretion.",
  },
];

const CATEGORIES = [
  "Arts & crafts",
  "Sports & fitness",
  "Music & dance",
  "Theater & performing arts",
  "STEM & technology",
  "Nature & outdoor",
  "Cooking & baking",
  "Language & culture",
  "Academic tutoring",
  "Yoga & wellness",
  "Life skills",
  "Social & play",
];

const AGE_BUCKETS: Array<{ value: AgeBucket; label: string }> = [
  { value: "all", label: "All ages" },
  { value: "3-5", label: "3–5" },
  { value: "6-8", label: "6–8" },
  { value: "9-12", label: "9–12" },
  { value: "13+", label: "13+" },
];

const AGE_BUCKET_SET = new Set<AgeBucket>(AGE_BUCKETS.map((b) => b.value));
const isAgeBucket = (v: string): v is AgeBucket =>
  AGE_BUCKET_SET.has(v as AgeBucket);

const normalizeAgeBuckets = (vals: AgeBucket[]): AgeBucket[] => {
  if (!vals.length) return [];
  if (vals.includes("all")) return ["all"];
  return vals.filter((v) => v !== "all");
};

const ageBucketToMinMax = (
  bucket: AgeBucket,
): { min: number | null; max: number | null } => {
  switch (bucket) {
    case "all":
      return { min: null, max: null };
    case "3-5":
      return { min: 3, max: 5 };
    case "6-8":
      return { min: 6, max: 8 };
    case "9-12":
      return { min: 9, max: 12 };
    case "13+":
      return { min: 13, max: null };
    default:
      return { min: null, max: null };
  }
};

const deriveMinMaxFromBuckets = (
  buckets: AgeBucket[],
): { min: number | null; max: number | null } => {
  if (!buckets.length) return { min: null, max: null };
  if (buckets.includes("all")) return { min: null, max: null };

  const mins: number[] = [];
  const maxs: Array<number | null> = [];

  for (const b of buckets) {
    const { min, max } = ageBucketToMinMax(b);
    if (min != null) mins.push(min);
    maxs.push(max);
  }

  const min = mins.length ? Math.min(...mins) : null;
  const hasOpenEnded = maxs.some((m) => m == null);
  const finiteMaxs = maxs.filter(
    (m): m is number => typeof m === "number",
  );
  const max = hasOpenEnded
    ? null
    : finiteMaxs.length
      ? Math.max(...finiteMaxs)
      : null;

  return { min, max };
};

const EXPERIENCE_LEVELS: Array<{ value: ExperienceLevel; label: string }> = [
  { value: "all_levels", label: "All levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const CLASS_FREQUENCY_OPTIONS: Array<{
  value: ClassFrequency;
  label: string;
}> = [
  { value: "once_week", label: "Once a week" },
  { value: "twice_week", label: "Twice a week" },
  { value: "three_week", label: "Three times a week" },
  { value: "multiple_week", label: "Multiple times a week" },
  { value: "daily", label: "Daily" },
  { value: "flexible", label: "Flexible" },
];

const CLASS_DURATION_OPTIONS = [
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
  { value: "150", label: "2.5 hours" },
  { value: "180", label: "3 hours" },
  { value: "240", label: "4 hours" },
];

const SESSION_LENGTH_OPTIONS = [
  { value: "1", label: "1 week" },
  { value: "2", label: "2 weeks" },
  { value: "3", label: "3 weeks" },
  { value: "4", label: "4 weeks" },
  { value: "6", label: "6 weeks" },
  { value: "8", label: "8 weeks" },
  { value: "10", label: "10 weeks" },
  { value: "12", label: "12 weeks" },
  { value: "16", label: "16 weeks" },
];

const MEETING_LENGTH_OPTIONS = [
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
  { value: "150", label: "2.5 hours" },
  { value: "180", label: "3 hours" },
];

const DAY_SELECT_OPTIONS: Array<{ value: DayKey; label: string }> = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
];

const makeDefaultClassSection = (): ClassSessionSection => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  day: "",
  capacity: "",
  startTime: "",
  endTime: "",
});

const DAY_LABELS: Array<[DayKey, string, string]> = [
  ["sun", "Sunday", "Sun"],
  ["mon", "Monday", "Mon"],
  ["tue", "Tuesday", "Tue"],
  ["wed", "Wednesday", "Wed"],
  ["thu", "Thursday", "Thu"],
  ["fri", "Friday", "Fri"],
  ["sat", "Saturday", "Sat"],
];

const makeDefaultBlock = (): TimeBlock => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  start: "09:00",
  end: "10:00",
});

const makeDefaultClassWeekly = (): ClassWeeklySchedule => ({
  sun: { available: false, blocks: [] },
  mon: { available: true, blocks: [makeDefaultBlock()] },
  tue: { available: true, blocks: [makeDefaultBlock()] },
  wed: { available: true, blocks: [makeDefaultBlock()] },
  thu: { available: true, blocks: [makeDefaultBlock()] },
  fri: { available: true, blocks: [makeDefaultBlock()] },
  sat: { available: false, blocks: [] },
});

const makeDefaultCampSession = (): CampSession => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  label: "",
  startDate: "",
  endDate: "",
  days: ["mon", "tue", "wed", "thu", "fri"],
  startTime: "09:00",
  endTime: "10:00",
  capacity: "",
  enableWaitlist: false,
  price_cents: null,
  experienceLevel: [],
  priceText: "",
});

const MAX_PHOTOS = 9;

const makeId = () => {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID)
      return crypto.randomUUID();
  } catch {}
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const parseMoneyToCents = (raw: string): number | null => {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;

  const parts = cleaned.split(".");
  const dollarsPart = parts[0] ?? "0";
  const decimalsPart = (parts[1] ?? "").slice(0, 2);

  const dollars = Number.parseInt(dollarsPart || "0", 10);
  if (Number.isNaN(dollars)) return null;

  const cents = Number.parseInt(
    decimalsPart.padEnd(2, "0") || "0",
    10,
  );
  if (Number.isNaN(cents)) return null;

  return dollars * 100 + cents;
};

const formatCentsToMoneyText = (cents: number): string => {
  const value = (cents / 100).toFixed(2);
  return value.replace(/\.00$/, "");
};

const sanitizeMoneyInput = (raw: string): string => {
  let v = raw.replace(/[^0-9.]/g, "");
  const firstDot = v.indexOf(".");
  if (firstDot !== -1) {
    v =
      v.slice(0, firstDot + 1) +
      v.slice(firstDot + 1).replace(/\./g, "");
    const [a, b] = v.split(".");
    v = `${a}.${(b ?? "").slice(0, 2)}`;
  }
  return v;
};

type UploadedImagesResult = {
  heroUrl?: string | null;
  galleryUrls?: Array<string | null | undefined> | null;
};

const combineLocalDateAndTimeToISO = (
  dateYYYYMMDD: string,
  timeHHMM: string,
): string | null => {
  if (!dateYYYYMMDD || !timeHHMM) return null;
  const d = new Date(`${dateYYYYMMDD}T${timeHHMM}:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

/* ------------------------------------------------------------------ */
/* Stepper                                                            */
/* ------------------------------------------------------------------ */

const STEPS = [
  { key: "basics", label: "Basics" },
  { key: "description", label: "Description" },
  { key: "schedule", label: "Schedule" },
  { key: "photos", label: "Photos" },
  { key: "details", label: "Details" },
  { key: "review", label: "Review" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

function Stepper({
  currentIndex,
}: {
  currentIndex: number;
  onNavigate: (index: number) => void;
}) {
  const pct = Math.round(((currentIndex + 1) / STEPS.length) * 100);
  const label = STEPS[currentIndex]?.label ?? "";

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Step {currentIndex + 1} of {STEPS.length}
        <span className="mx-1.5 text-muted-foreground/40">·</span>
        <span className="font-medium text-foreground">{label}</span>
      </p>
      <div className="h-1 w-full rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-foreground transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reusable sub-components                                            */
/* ------------------------------------------------------------------ */

function RadioCard({
  selected,
  onClick,
  children,
  disabled,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 rounded-xl px-5 py-4 text-left text-sm font-medium transition-colors ${
        selected
          ? "border-2 border-foreground bg-foreground/5"
          : "border border-input bg-transparent hover:bg-gray-50"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {children}
    </button>
  );
}

function CheckboxCard({
  checked,
  onClick,
  children,
  disabled,
}: {
  checked: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-3 text-left text-sm transition-colors ${
        checked
          ? "border-2 border-foreground bg-foreground/5 font-medium"
          : "border border-input bg-transparent hover:bg-gray-50"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint && (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

/** Expanding checkbox card — collapsed: checkbox + label + description.
 *  Expanded: bordered card with nested form fields. */
function ExpandableCheckboxCard({
  checked,
  onCheckedChange,
  title,
  description,
  children,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl transition-colors ${
        checked
          ? "border-2 border-foreground bg-foreground/[0.02]"
          : "border border-input bg-transparent"
      }`}
    >
      {/* Header — always visible */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onCheckedChange(!checked)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onCheckedChange(!checked); } }}
        className="flex w-full items-start gap-3 px-4 py-4 text-left cursor-pointer"
      >
        <Checkbox
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
          className="mt-0.5 shrink-0 pointer-events-none"
        />
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">{title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {description}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {checked && (
        <div className="px-4 pb-4 pt-0">
          <div className="space-y-4">{children}</div>
        </div>
      )}
    </div>
  );
}

/** Small tip / example banner */
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg bg-blue-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-blue-800">
      <span className="material-symbols-rounded select-none shrink-0 mt-px text-blue-500" style={{ fontSize: 14 }} aria-hidden="true">lightbulb</span>
      <p>{children}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Props for edit mode                                                */
/* ------------------------------------------------------------------ */

export type CreateActivityPageProps = {
  activityId?: string | null;
  initialStep?: number;
  /** When true, skips the page-container/grid wrapper (used inside the activity layout) */
  embedded?: boolean;
};

/* ------------------------------------------------------------------ */
/* Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function CreateActivityPage({
  activityId: propActivityId,
  initialStep,
  embedded = false,
}: CreateActivityPageProps = {}) {
  const router = useRouter();

  const activityId = propActivityId ?? null;
  const isEditMode = Boolean(activityId);

  // Tracks the Supabase ID for the current draft (set on first auto-save if new listing)
  const [draftId, setDraftId] = useState<string | null>(activityId ?? null);

  /* Step state */
  const [stepIndex, setStepIndex] = useState(initialStep ?? 0);

  /* Basics */
  const [activityKind, setActivityKind] = useState<ActivityKind>("camp");
  const [dateEntryMode, setDateEntryMode] = useState<DateEntryMode>("range");
  const [enrollmentMode, setEnrollmentMode] = useState<EnrollmentMode>("full_program");
  const [bookingModel, setBookingModel] = useState<"per_session" | "per_class">("per_session");
  // True only for existing "class" listings created with the old scheduler
  const [isLegacyClassListing, setIsLegacyClassListing] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationType, setLocationType] = useState<LocationType>("in_person");
  const [isVirtual, setIsVirtual] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [experienceLevels, setExperienceLevels] = useState<ExperienceLevel[]>([]);

  /* Money */
  const [priceText, setPriceText] = useState("");
  const [priceCents, setPriceCents] = useState<number | null>(null);

  /* Age buckets + cancellation */
  const [ageBuckets, setAgeBuckets] = useState<AgeBucket[]>([]);
  const [cancellationPolicy, setCancellationPolicy] = useState<string>(
    CANCELLATION_OPTIONS[0]?.value ?? "",
  );

  /* Photos */
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [originalExistingUrls, setOriginalExistingUrls] = useState<string[]>(
    [],
  );

  /* Activities (description step) — start with 3 open (mandatory minimum).
     Use lazy initializer so makeId() runs once on the client, not on every
     server render, avoiding hydration-ID mismatches. */
  const [activities, setActivities] = useState<ActivityItem[]>(() => [
    { id: makeId(), title: "", description: "" },
    { id: makeId(), title: "", description: "" },
    { id: makeId(), title: "", description: "" },
  ]);

  /* Scheduling type */
  const [activityType, setActivityType] = useState<ActivityType>("fixed");

  /* Fixed schedule */
  const [fixedStartDate, setFixedStartDate] = useState("");
  const [fixedEndDate, setFixedEndDate] = useState("");
  const [fixedStartTime, setFixedStartTime] = useState("");
  const [fixedEndTime, setFixedEndTime] = useState("");
  const [fixedAllDay, setFixedAllDay] = useState(false);
  const [fixedRepeatRule, setFixedRepeatRule] = useState("none");

  /* Ongoing schedule */
  const [ongoingStartDate, setOngoingStartDate] = useState("");
  const [ongoingEndDate, setOngoingEndDate] = useState("");
  const [showAdvancedAvailability, setShowAdvancedAvailability] =
    useState(false);

  const [weeklySchedule, setWeeklySchedule] = useState<
    Record<DayKey, DaySchedule>
  >({
    sun: { start: "", end: "" },
    mon: { start: "", end: "" },
    tue: { start: "", end: "" },
    wed: { start: "", end: "" },
    thu: { start: "", end: "" },
    fri: { start: "", end: "" },
    sat: { start: "", end: "" },
  });

  const updateDaySchedule = (
    day: DayKey,
    field: "start" | "end",
    value: string,
  ) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  /* Camp sessions */
  const [campSessions, setCampSessions] = useState<CampSession[]>(() => [
    makeDefaultCampSession(),
  ]);

  const updateCampSession = (
    id: string,
    patch: Partial<CampSession>,
  ) => {
    setCampSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  };

  const addCampSession = () => {
    setCampSessions((prev) => [...prev, makeDefaultCampSession()]);
  };

  const removeCampSession = (id: string) => {
    setCampSessions((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((s) => s.id !== id);
    });
  };

  const copyCampSession = (id: string) => {
    setCampSessions((prev) => {
      const source = prev.find((s) => s.id === id);
      if (!source) return prev;
      const idx = prev.indexOf(source);
      const copy: CampSession = {
        ...source,
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  /* Activity helpers */
  const addActivity = () => {
    setActivities((prev) => [
      ...prev,
      { id: makeId(), title: "", description: "" },
    ]);
  };

  const removeActivity = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  const copyActivity = (id: string) => {
    setActivities((prev) => {
      const source = prev.find((a) => a.id === id);
      if (!source) return prev;
      const idx = prev.indexOf(source);
      const copy: ActivityItem = { ...source, id: makeId() };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const updateActivity = (id: string, patch: Partial<ActivityItem>) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    );
  };

  /* Class schedule */
  const [classScheduleMode, setClassScheduleMode] =
    useState<ClassScheduleMode>("ongoing");
  const [classWeekly, setClassWeekly] = useState<ClassWeeklySchedule>(
    makeDefaultClassWeekly,
  );
  const [classDuration, setClassDuration] = useState("");
  const [classStudentsPerClass, setClassStudentsPerClass] = useState("");
  const [classPricePerClass, setClassPricePerClass] = useState("");
  const [classFrequency, setClassFrequency] =
    useState<ClassFrequency>("once_week");

  /* Class sessions mode fields */
  const [classSessionLength, setClassSessionLength] = useState("");
  const [classSessionEndDate, setClassSessionEndDate] = useState("");
  const [classMeetingLength, setClassMeetingLength] = useState("");
  const [classSessionStartDate, setClassSessionStartDate] = useState("");
  const [classPricePerMeeting, setClassPricePerMeeting] = useState("");
  const [classSections, setClassSections] = useState<ClassSessionSection[]>(
    () => [makeDefaultClassSection()],
  );

  const updateClassSection = (
    id: string,
    patch: Partial<ClassSessionSection>,
  ) => {
    setClassSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  };

  const addClassSection = () => {
    setClassSections((prev) => [...prev, makeDefaultClassSection()]);
  };

  const removeClassSection = (id: string) => {
    setClassSections((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((s) => s.id !== id);
    });
  };

  const copyClassSection = (id: string) => {
    setClassSections((prev) => {
      const source = prev.find((s) => s.id === id);
      if (!source) return prev;
      const idx = prev.indexOf(source);
      const copy: ClassSessionSection = {
        ...source,
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const toggleClassDayAvailable = (day: DayKey) => {
    setClassWeekly((prev) => {
      const d = prev[day];
      if (d.available) {
        return { ...prev, [day]: { available: false, blocks: [] } };
      }
      return {
        ...prev,
        [day]: { available: true, blocks: [makeDefaultBlock()] },
      };
    });
  };

  const addClassTimeBlock = (day: DayKey) => {
    setClassWeekly((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        blocks: [...prev[day].blocks, makeDefaultBlock()],
      },
    }));
  };

  const removeClassTimeBlock = (day: DayKey, blockId: string) => {
    setClassWeekly((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        blocks: prev[day].blocks.filter((b) => b.id !== blockId),
      },
    }));
  };

  const updateClassTimeBlock = (
    day: DayKey,
    blockId: string,
    field: "start" | "end",
    value: string,
  ) => {
    setClassWeekly((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        blocks: prev[day].blocks.map((b) =>
          b.id === blockId ? { ...b, [field]: value } : b,
        ),
      },
    }));
  };

  const copyClassTimeBlock = (day: DayKey, blockId: string) => {
    setClassWeekly((prev) => {
      const d = prev[day];
      const source = d.blocks.find((b) => b.id === blockId);
      if (!source) return prev;
      const idx = d.blocks.indexOf(source);
      const copy: TimeBlock = {
        ...source,
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      };
      const next = [...d.blocks];
      next.splice(idx + 1, 0, copy);
      return { ...prev, [day]: { ...d, blocks: next } };
    });
  };

  /* Advanced controls */
  const [offerEarlyDropoff, setOfferEarlyDropoff] = useState(false);
  const [earlyDropoffPrice, setEarlyDropoffPrice] = useState("");
  const [earlyDropoffStart, setEarlyDropoffStart] = useState("");
  const [earlyDropoffEnd, setEarlyDropoffEnd] = useState("");

  const [offerExtendedDay, setOfferExtendedDay] = useState(false);
  const [extendedDayPrice, setExtendedDayPrice] = useState("");
  const [extendedDayStart, setExtendedDayStart] = useState("");
  const [extendedDayEnd, setExtendedDayEnd] = useState("");

  const [customAddOns, setCustomAddOns] = useState<Array<{ id: string; name: string; price: string }>>([]);

  /* Sibling discount */
  const [offerSiblingDiscount, setOfferSiblingDiscount] = useState(false);
  const [siblingDiscountType, setSiblingDiscountType] =
    useState<SiblingDiscountType>("none");
  const [siblingDiscountValue, setSiblingDiscountValue] = useState("");

  /* Multi-session discount */
  const [offerMultiSessionDiscount, setOfferMultiSessionDiscount] = useState(false);
  const [multiSessionDiscountPercent, setMultiSessionDiscountPercent] = useState("");

  /* Submit / load state */
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [existingSlug, setExistingSlug] = useState<string | null>(null);

  /* Popover tooltips — must live here (before any early returns) so hook
     count stays constant between the initialLoading pass and later renders. */
  const [showOngoingTip, setShowOngoingTip] = useState(false);
  const [showSessionsTip, setShowSessionsTip] = useState(false);

  const selectedCancellationHelper = useMemo(() => {
    const found = CANCELLATION_OPTIONS.find(
      (o) => o.value === cancellationPolicy,
    );
    return found?.helper ?? "";
  }, [cancellationPolicy]);

  /* Sync stepIndex with browser back/forward */
  useEffect(() => {
    const handlePop = () => {
      const match = window.location.pathname.match(/\/host\/activities\/new\/[^/]+\/(\d+)$/);
      setStepIndex(match ? Number(match[1]) : 0);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  /* Cleanup object URLs */
  useEffect(() => {
    return () => {
      photoItems.forEach((it) => {
        if (it.origin === "new" && it.src?.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(it.src);
          } catch {}
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Load existing camp in edit mode */
  useEffect(() => {
    if (!isEditMode || !activityId) return;

    let isMounted = true;

    const loadCamp = async () => {
      setInitialLoading(true);
      setInitialError(null);

      const { data, error } = await supabase
        .from("camps")
        .select(
          "id, slug, name, description, location, lat, lng, price_cents, is_published, hero_image_url, image_urls, meta, start_local, end_local, schedule_tz, start_time, end_time",
        )
        .eq("id", activityId)
        .single();

      if (!isMounted) return;

      if (error || !data) {
        console.error("[CreateActivityPage] error loading camp:", error);
        setInitialError("Could not load this activity for editing.");
        setInitialLoading(false);
        return;
      }

      const meta = (data.meta || {}) as CampMeta;

      setExistingSlug(data.slug ?? null);
      setTitle(data.name ?? "");
      setDescription(data.description ?? "");
      setLocation(data.location ?? "");
      if ((data as any).lat) setLocationLat((data as any).lat);
      if ((data as any).lng) setLocationLng((data as any).lng);

      /* Top-level price only applies to non-camp kinds (camps use per-session prices) */
      if (meta.activityKind !== "camp") {
        if (data.price_cents != null) {
          setPriceCents(data.price_cents);
          setPriceText(formatCentsToMoneyText(data.price_cents));
        } else {
          setPriceCents(null);
          setPriceText("");
        }
      }

      setVisibility(
        meta.visibility ?? (data.is_published ? "public" : "private"),
      );
      setIsVirtual(Boolean(meta.isVirtual));
      if (meta.isVirtual) setLocationType("virtual");
      if (meta.meetingUrl) setMeetingUrl(meta.meetingUrl);
      setActivityType(meta.activityType ?? "fixed");
      if (meta.activityKind) {
        setActivityKind(meta.activityKind);
        setEnrollmentMode(meta.activityKind === "class" ? "choose_sessions" : "full_program");
        // Legacy: old "class" listing that used classSchedule instead of campSessions
        const hasCampSessionDates =
          Array.isArray(meta.campSessions) &&
          meta.campSessions.length > 0 &&
          Boolean((meta.campSessions[0] as any)?.startDate);
        if (meta.activityKind === "class" && meta.classSchedule && !hasCampSessionDates) {
          setIsLegacyClassListing(true);
        }
      }
      if ((meta as any).dateEntryMode) setDateEntryMode((meta as any).dateEntryMode as DateEntryMode);
      if ((meta as any).enrollmentMode) setEnrollmentMode((meta as any).enrollmentMode as EnrollmentMode);
      // bookingModel derived from schedule type: ongoing → per_class, fixed → per_session
      setBookingModel(meta.activityKind === "class" ? "per_class" : "per_session");
      if (meta.experienceLevel) setExperienceLevels(meta.experienceLevel);
      if (meta.category) setCategory(meta.category);

      /* Age buckets */
      if (Array.isArray(meta.age_buckets) && meta.age_buckets.length) {
        setAgeBuckets(normalizeAgeBuckets(meta.age_buckets));
      } else if (meta.age_bucket) {
        setAgeBuckets(
          meta.age_bucket === "all" ? [] : [meta.age_bucket],
        );
      } else {
        const min = meta.min_age ?? null;
        const max = meta.max_age ?? null;
        if (min === 3 && max === 5) setAgeBuckets(["3-5"]);
        else if (min === 6 && max === 8) setAgeBuckets(["6-8"]);
        else if (min === 9 && max === 12) setAgeBuckets(["9-12"]);
        else if (min === 13 && max == null) setAgeBuckets(["13+"]);
        else setAgeBuckets([]);
      }

      /* Cancellation */
      setCancellationPolicy(
        (meta.cancellation_policy && String(meta.cancellation_policy)) ||
          (CANCELLATION_OPTIONS[0]?.value ?? ""),
      );

      if (meta.additionalDetails) setAdditionalDetails(meta.additionalDetails);

      /* Schedules */
      const fixed = meta.fixedSchedule || {};
      setFixedStartDate(fixed.startDate ?? "");
      setFixedEndDate(fixed.endDate ?? "");
      setFixedAllDay(Boolean(fixed.allDay));
      setFixedRepeatRule(fixed.repeatRule ?? "none");

      const dbStartLocal = (data as any).start_local as string | null;
      const dbEndLocal = (data as any).end_local as string | null;

      setFixedStartTime(fixed.startTime ?? dbStartLocal ?? "");
      setFixedEndTime(fixed.endTime ?? dbEndLocal ?? "");

      const ongoing = meta.ongoingSchedule || {};
      setOngoingStartDate(ongoing.startDate ?? "");
      setOngoingEndDate(ongoing.endDate ?? "");

      if (meta.weeklySchedule) {
        setWeeklySchedule((prev) => ({ ...prev, ...meta.weeklySchedule! }));
      }

      /* Camp sessions — rehydrate priceText from persisted price_cents */
      if (Array.isArray(meta.campSessions) && meta.campSessions.length) {
        setCampSessions(
          meta.campSessions.map((s: any) => ({
            ...s,
            price_cents: s.price_cents ?? null,
            priceText: s.price_cents != null ? formatCentsToMoneyText(s.price_cents) : "",
            experienceLevel: s.experienceLevel ?? [],
          })),
        );
      }

      /* Activities */
      if (Array.isArray(meta.activities) && meta.activities.length) {
        setActivities(meta.activities);
      }

      /* Class schedule */
      if (meta.classSchedule) {
        const cs = meta.classSchedule;
        if (cs.mode) setClassScheduleMode(cs.mode);
        if (cs.weekly) setClassWeekly(cs.weekly);
        if (cs.duration) setClassDuration(cs.duration);
        if (cs.studentsPerClass)
          setClassStudentsPerClass(cs.studentsPerClass);
        if (cs.pricePerClass) setClassPricePerClass(cs.pricePerClass);
        if (cs.frequency) setClassFrequency(cs.frequency);
        if (cs.sessionLength) setClassSessionLength(cs.sessionLength);
        if (cs.sessionEndDate) setClassSessionEndDate(cs.sessionEndDate);
        if (cs.meetingLength) setClassMeetingLength(cs.meetingLength);
        if (cs.sessionStartDate) setClassSessionStartDate(cs.sessionStartDate);
        if (cs.pricePerMeeting) setClassPricePerMeeting(cs.pricePerMeeting);
        if (Array.isArray(cs.sections) && cs.sections.length)
          setClassSections(cs.sections);
      }

      const adv = meta.advanced || {};
      const early = adv.earlyDropoff || {};
      const ext = adv.extendedDay || {};
      const sib = adv.siblingDiscount || {};

      setOfferEarlyDropoff(Boolean(early.enabled));
      setEarlyDropoffPrice(early.price ?? "");
      setEarlyDropoffStart(early.start ?? "");
      setEarlyDropoffEnd(early.end ?? "");

      setOfferExtendedDay(Boolean(ext.enabled));
      setExtendedDayPrice(ext.price ?? "");
      setExtendedDayStart(ext.start ?? "");
      setExtendedDayEnd(ext.end ?? "");
      setCustomAddOns(Array.isArray(adv.customAddOns) ? adv.customAddOns : []);

      const msd = adv.multiSessionDiscount || {};
      setOfferMultiSessionDiscount(Boolean(msd.enabled));
      setMultiSessionDiscountPercent(msd.percent ?? "");

      const legacyPrice = (sib as any).price as string | undefined;
      const loadedEnabled = Boolean(sib.enabled);
      const loadedType: SiblingDiscountType =
        sib.type ?? (loadedEnabled ? "amount" : "none");

      setOfferSiblingDiscount(loadedEnabled);
      setSiblingDiscountType(loadedEnabled ? loadedType : "none");
      setSiblingDiscountValue((sib.value ?? legacyPrice ?? "") as string);

      /* Photos */
      const existingHero = data.hero_image_url ?? null;
      const existingGallery = (
        ((data.image_urls as string[]) || []) as string[]
      ).filter(Boolean);
      const allExisting = [
        ...(existingHero ? [existingHero] : []),
        ...existingGallery,
      ].filter(Boolean) as string[];

      setOriginalExistingUrls(allExisting);

      setPhotoItems(
        allExisting.slice(0, MAX_PHOTOS).map((url) => ({
          id: `url:${url}`,
          src: url,
          origin: "existing",
          url,
        })),
      );

      setInitialLoading(false);
    };

    void loadCamp();

    return () => {
      isMounted = false;
    };
  }, [isEditMode, activityId]);

  /* ---------------------------------------------------------------- */
  /* Build payload and save                                           */
  /* ---------------------------------------------------------------- */

  const slugify = (value: string): string => {
    const base =
      value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-") || "camp";
    const suffix = Math.random().toString(36).slice(2, 6);
    return `${base}-${suffix}`;
  };

  const buildPayloadAndSave = async (hostId: string) => {
    const { min, max } = deriveMinMaxFromBuckets(ageBuckets);

    /* Derive effective price: per-session min for all unified listings, top-level for legacy class */
    const sessionPrices = !isLegacyClassListing
      ? campSessions.map((s) => s.price_cents).filter((p): p is number => p != null)
      : [];
    const effectivePriceCents = !isLegacyClassListing
      ? (sessionPrices.length > 0 ? Math.min(...sessionPrices) : null)
      : priceCents;

    const legacyAgeBucket: AgeBucket =
      ageBuckets.length === 1 ? ageBuckets[0] : "all";

    const effectiveSiblingType: SiblingDiscountType =
      offerSiblingDiscount
        ? siblingDiscountType === "none"
          ? "percent"
          : siblingDiscountType
        : "none";

    const meta: CampMeta = {
      visibility,
      isVirtual: locationType === "virtual",
      meetingUrl: locationType === "virtual" ? meetingUrl || undefined : undefined,
      activityType,
      activityKind,
      ...(!isLegacyClassListing ? { enrollmentMode, dateEntryMode, bookingModel } as any : {}),
      experienceLevel: experienceLevels.length ? experienceLevels : undefined,
      category: category || undefined,
      cancellation_policy: cancellationPolicy || null,
      additionalDetails: additionalDetails || undefined,
      age_buckets: ageBuckets,
      age_bucket: legacyAgeBucket,
      min_age: min,
      max_age: max,
      fixedSchedule: {
        startDate: fixedStartDate || null,
        endDate: fixedEndDate || null,
        startTime: fixedAllDay ? null : fixedStartTime || null,
        endTime: fixedAllDay ? null : fixedEndTime || null,
        allDay: fixedAllDay,
        repeatRule: fixedRepeatRule,
      },
      ongoingSchedule: {
        startDate: ongoingStartDate || null,
        endDate: ongoingEndDate || null,
      },
      weeklySchedule,
      // Always persist campSessions — used by both full_program and choose_sessions modes
      campSessions: campSessions.map(({ priceText: _pt, ...rest }) => rest) as CampSession[],
      // Only preserve classSchedule for legacy class listings edited via the old UI
      classSchedule: isLegacyClassListing
        ? {
            mode: classScheduleMode,
            weekly: classWeekly,
            duration: classDuration || undefined,
            studentsPerClass: classStudentsPerClass || undefined,
            pricePerClass: classPricePerClass || undefined,
            frequency: classFrequency,
            sessionLength: classSessionLength || undefined,
            sessionEndDate: classSessionEndDate || undefined,
            meetingLength: classMeetingLength || undefined,
            sessionStartDate: classSessionStartDate || undefined,
            pricePerMeeting: classPricePerMeeting || undefined,
            sections: classSections.length ? classSections : undefined,
          }
        : undefined,
      advanced: {
        earlyDropoff: {
          enabled: offerEarlyDropoff,
          price: offerEarlyDropoff ? earlyDropoffPrice || null : null,
          start: offerEarlyDropoff ? earlyDropoffStart || null : null,
          end: offerEarlyDropoff ? earlyDropoffEnd || null : null,
        },
        extendedDay: {
          enabled: offerExtendedDay,
          price: offerExtendedDay ? extendedDayPrice || null : null,
          start: offerExtendedDay ? extendedDayStart || null : null,
          end: offerExtendedDay ? extendedDayEnd || null : null,
        },
        siblingDiscount: {
          enabled:
            offerSiblingDiscount && effectiveSiblingType !== "none",
          type: offerSiblingDiscount ? effectiveSiblingType : "none",
          value:
            offerSiblingDiscount && effectiveSiblingType !== "none"
              ? siblingDiscountValue || null
              : null,
        },
        multiSessionDiscount: activityKind === "camp" ? {
          enabled:
            offerMultiSessionDiscount &&
            campSessions.length >= 2 &&
            Boolean(multiSessionDiscountPercent),
          percent: offerMultiSessionDiscount ? multiSessionDiscountPercent || null : null,
        } : undefined,
        customAddOns: customAddOns.filter(a => a.name.trim()).length > 0
          ? customAddOns.filter(a => a.name.trim())
          : undefined,
      },
      pricing: {
        price_cents: effectivePriceCents ?? null,
        display: effectivePriceCents != null ? formatCentsToMoneyText(effectivePriceCents) : null,
        currency: "USD",
      },
      activities: activities.length ? activities : undefined,
    };

    const slug = existingSlug ?? slugify(title);

    /* Photos: ordered list; first is primary */
    const ordered = photoItems.slice(0, MAX_PHOTOS);
    const primary = ordered[0] ?? null;

    const primaryNewFile =
      primary?.origin === "new" ? (primary.file ?? null) : null;

    const otherNewFiles: File[] = ordered
      .slice(1)
      .filter((x) => x.origin === "new" && x.file)
      .map((x) => x.file!) as File[];

    let uploadedHeroUrl: string | null = null;
    let uploadedGalleryUrls: string[] = [];

    if (primaryNewFile || otherNewFiles.length) {
      const uploaded = (await uploadActivityImages({
        bucket: "activity-images",
        slug,
        heroImage: primaryNewFile,
        galleryImages: otherNewFiles,
      })) as UploadedImagesResult;

      uploadedHeroUrl = uploaded?.heroUrl ?? null;
      uploadedGalleryUrls = Array.isArray(uploaded?.galleryUrls)
        ? uploaded.galleryUrls.filter(isNonEmptyString)
        : [];
    }

    let galleryCursor = 0;

    const orderedUrls: string[] = ordered
      .map((item, idx) => {
        if (item.origin === "existing") return item.url ?? item.src;
        if (idx === 0) return uploadedHeroUrl;
        const next = uploadedGalleryUrls[galleryCursor] ?? null;
        galleryCursor += 1;
        return next;
      })
      .filter(isNonEmptyString);

    const heroUrl = orderedUrls[0] ?? null;
    const galleryUrls = orderedUrls.slice(1);
    const primaryCardUrl = heroUrl ?? galleryUrls[0] ?? null;

    /* Scheduling fields */
    const scheduleTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago";

    const startLocal =
      activityType === "fixed" &&
      fixedAllDay === false &&
      fixedStartTime
        ? fixedStartTime
        : null;

    const endLocal =
      activityType === "fixed" &&
      fixedAllDay === false &&
      fixedEndTime
        ? fixedEndTime
        : null;

    const startTimeISO =
      activityType === "fixed" &&
      fixedAllDay === false &&
      fixedStartDate &&
      fixedStartTime
        ? combineLocalDateAndTimeToISO(fixedStartDate, fixedStartTime)
        : null;

    const endTimeDate = fixedEndDate || fixedStartDate;
    const endTimeISO =
      activityType === "fixed" &&
      fixedAllDay === false &&
      endTimeDate &&
      fixedEndTime
        ? combineLocalDateAndTimeToISO(endTimeDate, fixedEndTime)
        : null;

    // Compute session date range from campSessions (for search date filtering)
    const sessionDates = campSessions
      .map((s) => ({ start: s.startDate, end: s.endDate }))
      .filter((s) => s.start && s.end);
    const session_start =
      sessionDates.length > 0
        ? sessionDates.reduce(
            (min, s) => (s.start! < min ? s.start! : min),
            sessionDates[0].start!,
          )
        : null;
    const session_end =
      sessionDates.length > 0
        ? sessionDates.reduce(
            (max, s) => (s.end! > max ? s.end! : max),
            sessionDates[0].end!,
          )
        : null;

    const payload = {
      name: title.trim(),
      slug,
      description: description || null,
      location: locationType === "virtual" ? "Virtual" : location || null,
      lat: locationType === "virtual" ? null : (locationLat ?? null),
      lng: locationType === "virtual" ? null : (locationLng ?? null),
      session_start: session_start ?? null,
      session_end: session_end ?? null,
      price_cents: effectivePriceCents,
      host_id: hostId,
      is_published: visibility === "public",
      is_active: true,
      status: "active",
      hero_image_url: heroUrl,
      image_urls: galleryUrls.length ? galleryUrls : null,
      image_url: primaryCardUrl,
      meta,
      schedule_tz: scheduleTz,
      start_local: startLocal,
      end_local: endLocal,
      start_time: startTimeISO,
      end_time: endTimeISO,
    };

    // Use draftId (may have been created by auto-save) or fall back to activityId
    const existingId = draftId ?? activityId;
    let savedId = existingId ?? null;

    if (existingId) {
      const { data, error } = await supabase
        .from("camps")
        .update(payload)
        .eq("id", existingId)
        .select("id, slug")
        .single();

      if (error || !data) throw error ?? new Error("Update failed");
      savedId = data.id;
    } else {
      const { data, error } = await supabase
        .from("camps")
        .insert(payload)
        .select("id, slug")
        .single();

      if (error || !data) throw error ?? new Error("Insert failed");
      savedId = data.id;
    }

    if (savedId) router.push(`/host/activities/${savedId}`);
    else router.push("/host/listings");
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    if (!title.trim()) {
      setSubmitError("Please add a title for your activity.");
      return;
    }

    if (isLegacyClassListing && priceText.trim() && priceCents === null) {
      setSubmitError("Please enter a valid price (for example 450 or 450.00).");
      return;
    }

    if (
      activityKind === "camp" &&
      offerMultiSessionDiscount &&
      (!multiSessionDiscountPercent || Number(multiSessionDiscountPercent) <= 0)
    ) {
      setSubmitError("Please enter a multi-session discount percentage greater than 0.");
      return;
    }

    if (activityType === "fixed") {
      if (fixedStartDate && fixedEndDate) {
        const a = new Date(fixedStartDate);
        const b = new Date(fixedEndDate);
        if (
          !Number.isNaN(a.getTime()) &&
          !Number.isNaN(b.getTime()) &&
          b < a
        ) {
          setSubmitError("End date must be on or after the start date.");
          return;
        }
      }

      if (fixedAllDay === false) {
        if (
          (fixedStartTime && !fixedEndTime) ||
          (!fixedStartTime && fixedEndTime)
        ) {
          setSubmitError(
            "Please set both a start time and end time, or choose All day.",
          );
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData.user) {
        setSubmitError("You need to be signed in to save an activity.");
        return;
      }

      await buildPayloadAndSave(userData.user.id);
    } catch (err) {
      console.error("Unexpected error saving activity:", err);
      setSubmitError("Something went wrong while saving your activity.");
    } finally {
      setSubmitting(false);
    }
  };

  /** Build the full meta + payload without validation — used by both draft and publish */
  const buildPayload = (publish: boolean, hostId: string) => {
    const { min, max } = deriveMinMaxFromBuckets(ageBuckets);

    const sessionPrices = !isLegacyClassListing
      ? campSessions.map((s) => s.price_cents).filter((p): p is number => p != null)
      : [];
    const effectivePriceCents = !isLegacyClassListing
      ? (sessionPrices.length > 0 ? Math.min(...sessionPrices) : null)
      : priceCents;

    const legacyAgeBucket: AgeBucket = ageBuckets.length === 1 ? ageBuckets[0] : "all";
    const effectiveSiblingType: SiblingDiscountType =
      offerSiblingDiscount
        ? siblingDiscountType === "none" ? "percent" : siblingDiscountType
        : "none";

    const meta: CampMeta = {
      visibility,
      isVirtual: locationType === "virtual",
      meetingUrl: locationType === "virtual" ? meetingUrl || undefined : undefined,
      activityType,
      activityKind,
      ...(!isLegacyClassListing ? { enrollmentMode, dateEntryMode, bookingModel } as any : {}),
      experienceLevel: experienceLevels.length ? experienceLevels : undefined,
      category: category || undefined,
      cancellation_policy: cancellationPolicy || null,
      additionalDetails: additionalDetails || undefined,
      age_buckets: ageBuckets,
      age_bucket: legacyAgeBucket,
      min_age: min,
      max_age: max,
      fixedSchedule: {
        startDate: fixedStartDate || null,
        endDate: fixedEndDate || null,
        startTime: fixedAllDay ? null : fixedStartTime || null,
        endTime: fixedAllDay ? null : fixedEndTime || null,
        allDay: fixedAllDay,
        repeatRule: fixedRepeatRule,
      },
      ongoingSchedule: { startDate: ongoingStartDate || null, endDate: ongoingEndDate || null },
      weeklySchedule,
      campSessions: campSessions.map(({ priceText: _pt, ...rest }) => rest) as CampSession[],
      classSchedule: isLegacyClassListing
        ? {
            mode: classScheduleMode,
            weekly: classWeekly,
            duration: classDuration || undefined,
            studentsPerClass: classStudentsPerClass || undefined,
            pricePerClass: classPricePerClass || undefined,
            frequency: classFrequency,
            sessionLength: classSessionLength || undefined,
            sessionEndDate: classSessionEndDate || undefined,
            meetingLength: classMeetingLength || undefined,
            sessionStartDate: classSessionStartDate || undefined,
            pricePerMeeting: classPricePerMeeting || undefined,
            sections: classSections.length ? classSections : undefined,
          }
        : undefined,
      advanced: {
        earlyDropoff: {
          enabled: offerEarlyDropoff,
          price: offerEarlyDropoff ? earlyDropoffPrice || null : null,
          start: offerEarlyDropoff ? earlyDropoffStart || null : null,
          end: offerEarlyDropoff ? earlyDropoffEnd || null : null,
        },
        extendedDay: {
          enabled: offerExtendedDay,
          price: offerExtendedDay ? extendedDayPrice || null : null,
          start: offerExtendedDay ? extendedDayStart || null : null,
          end: offerExtendedDay ? extendedDayEnd || null : null,
        },
        siblingDiscount: {
          enabled: offerSiblingDiscount && effectiveSiblingType !== "none",
          type: offerSiblingDiscount ? effectiveSiblingType : "none",
          value: offerSiblingDiscount && effectiveSiblingType !== "none"
            ? siblingDiscountValue || null : null,
        },
        multiSessionDiscount: activityKind === "camp" ? {
          enabled: offerMultiSessionDiscount && campSessions.length >= 2 && Boolean(multiSessionDiscountPercent),
          percent: offerMultiSessionDiscount ? multiSessionDiscountPercent || null : null,
        } : undefined,
        customAddOns: customAddOns.filter(a => a.name.trim()).length > 0
          ? customAddOns.filter(a => a.name.trim())
          : undefined,
      },
      pricing: { display: effectivePriceCents != null ? `$${(effectivePriceCents / 100).toFixed(0)}` : "" },
    } as CampMeta;

    const slug = existingSlug ?? slugify(title || `draft-${Date.now()}`);

    return {
      name: title.trim() || "Untitled draft",
      slug,
      description: description || null,
      location: locationType === "virtual" ? "Virtual" : location || null,
      price_cents: effectivePriceCents,
      host_id: hostId,
      is_published: publish,
      is_active: publish,
      status: publish ? "active" : "inactive",
      hero_image_url: null,
      image_urls: null,
      image_url: null,
      meta,
      schedule_tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago",
      start_local: null,
      end_local: null,
      start_time: null,
      end_time: null,
    };
  };

  /** Auto-save draft to Supabase — fire and forget, does not redirect */
  const saveDraft = async (): Promise<string | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return draftId;
      const payload = buildPayload(false, userData.user.id);
      if (draftId) {
        await supabase.from("camps").update(payload).eq("id", draftId);
        return draftId;
      } else {
        const { data } = await supabase
          .from("camps")
          .insert(payload)
          .select("id")
          .single();
        if (data?.id) {
          setDraftId(data.id);
          return data.id;
        }
        return null;
      }
    } catch {
      // silent — draft save failures don't block the user
      return draftId;
    }
  };

  /** Edit mode: save current step and return to the activity page */
  const handleSaveChanges = async () => {
    setSavingDraft(true);
    try {
      await saveDraft();
      if (activityId) router.push(`/host/activities/${activityId}`);
      else router.push("/host/listings");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSaveForLater = async () => {
    setSavingDraft(true);
    try {
      await saveDraft();
      setSavedToast(true);
      setTimeout(() => {
        router.push("/host/listings");
      }, 800);
    } catch {
      setSavingDraft(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Navigation                                                       */
  /* ---------------------------------------------------------------- */

  const validateStep = (): string | null => {
    const step = STEPS[stepIndex]?.key;
    if (step === "basics") {
      if (!title.trim()) return "Please add a title for your activity.";
      if (!category) return "Please select a category.";
      if (ageBuckets.length === 0) return "Please select at least one age group.";
    }
    if (step === "description") {
      if (!description.trim()) return "Please add a description.";
    }
    if (step === "schedule") {
      if (activityKind === "camp") {
        for (const s of campSessions) {
          if (!s.startDate) return "Please set a start date for all sessions.";
          if (!s.endDate) return "Please set an end date for all sessions.";
          if (s.endDate < s.startDate) return "End date must be after start date.";
        }
      }
    }
    if (step === "details") {
      if (!priceText.trim()) return "Please set a price for your activity.";
    }
    return null;
  };

  const goNext = async () => {
    const err = validateStep();
    if (err) { setStepError(err); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setStepError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    const newStep = stepIndex + 1;
    if (stepIndex < STEPS.length - 1) {
      // Await on first save to get draftId for URL; subsequent saves are fire-and-forget
      const id = draftId ?? await saveDraft();
      if (draftId) void saveDraft();
      setStepIndex(newStep);
      if (id) window.history.pushState(null, "", `/host/activities/new/${id}/${newStep}`);
    } else {
      void handleSubmit();
    }
  };

  const goBack = () => {
    setStepError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (stepIndex === 0) {
      router.push("/host/listings");
    } else {
      window.history.back(); // triggers popstate → syncs stepIndex
    }
  };

  /* ---------------------------------------------------------------- */
  /* Render: loading / error states                                   */
  /* ---------------------------------------------------------------- */

  if (initialLoading) {
    return embedded ? (
      <div className="text-xs text-muted-foreground py-10">Loading activity...</div>
    ) : (
      <main className="flex-1 min-h-screen">
        <div className="page-container py-10"><div className="page-grid"><div className="span-8-center text-xs text-muted-foreground">
          Loading activity...
        </div></div></div>
      </main>
    );
  }

  if (initialError) {
    return embedded ? (
      <div className="py-10">
        <div className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-xs text-destructive">{initialError}</div>
        <Button type="button" variant="outline" className="text-sm" onClick={() => router.push("/host/listings")}>Back to listings</Button>
      </div>
    ) : (
      <main className="flex-1 min-h-screen">
        <div className="page-container py-10"><div className="page-grid"><div className="span-8-center">
          <div className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-xs text-destructive">
            {initialError}
          </div>
          <Button
            type="button"
            variant="outline"
            className="text-sm"
            onClick={() => router.push("/host/listings")}
          >
            Back to listings
          </Button>
        </div></div></div>
      </main>
    );
  }


  /* ---------------------------------------------------------------- */
  /* Step content                                                     */
  /* ---------------------------------------------------------------- */

  const renderBasics = () => (
    <div className="space-y-6">
      {/* Basics card */}
      <FormCard title="Let's fill in the basics">
        <div className="space-y-4">
          {/* Title */}
          <Field label="Title" required>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your activity a clear name"
            />
          </Field>

          {/* Location type */}
          <Field label="Location">
            <div className="flex gap-3">
              <RadioCard
                selected={locationType === "in_person"}
                onClick={() => {
                  setLocationType("in_person");
                  setIsVirtual(false);
                  if (location.trim().toLowerCase() === "virtual") setLocation("");
                }}
              >
                <div className="font-medium text-sm">In person</div>
              </RadioCard>
              <RadioCard
                selected={locationType === "virtual"}
                onClick={() => {
                  setLocationType("virtual");
                  setIsVirtual(true);
                  setLocation("Virtual");
                }}
              >
                <div className="font-medium text-sm">Virtual</div>
              </RadioCard>
            </div>
            {locationType === "in_person" && (
              <div className="mt-3">
                <AddressInput
                  value={location}
                  onChange={setLocation}
                  onSelect={(sel) => {
                    /* Store full formatted address, stripping trailing country */
                    const addr = sel.formattedAddress || sel.line1 || location;
                    setLocation(
                      addr
                        .replace(/, USA$/, "")
                        .replace(/, United States$/, ""),
                    );
                    if (sel.location) {
                      setLocationLat(sel.location.lat);
                      setLocationLng(sel.location.lng);
                    }
                  }}
                  placeholder="Start typing an address"
                />
              </div>
            )}
            {locationType === "virtual" && (
              <div className="mt-3">
                <Input
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="Paste your Zoom, Google Meet, or other meeting link"
                  type="url"
                  autoComplete="off"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  You can also add or update this later.
                </p>
              </div>
            )}
          </Field>

          {/* Category */}
          <Field label="Category">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Age groups */}
          <Field label="Age groups">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {AGE_BUCKETS.map((bucket) => (
                <CheckboxCard
                  key={bucket.value}
                  checked={ageBuckets.includes(bucket.value)}
                  onClick={() => {
                    if (bucket.value === "all") {
                      setAgeBuckets(ageBuckets.includes("all") ? [] : ["all"]);
                    } else {
                      const without = ageBuckets.filter((v) => v !== bucket.value && v !== "all");
                      const next = ageBuckets.includes(bucket.value)
                        ? without
                        : [...without, bucket.value];
                      setAgeBuckets(normalizeAgeBuckets(next.filter(isAgeBucket)));
                    }
                  }}
                >
                  {bucket.label}
                </CheckboxCard>
              ))}
            </div>
          </Field>

          {/* Experience level */}
          <Field label="Experience level">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EXPERIENCE_LEVELS.map((lvl) => (
                <CheckboxCard
                  key={lvl.value}
                  checked={experienceLevels.includes(lvl.value)}
                  onClick={() => {
                    if (lvl.value === "all_levels") {
                      setExperienceLevels(experienceLevels.includes("all_levels") ? [] : ["all_levels"]);
                    } else {
                      const without = experienceLevels.filter((v) => v !== lvl.value && v !== "all_levels");
                      const next = experienceLevels.includes(lvl.value)
                        ? without
                        : [...without, lvl.value];
                      setExperienceLevels(next);
                    }
                  }}
                >
                  {lvl.label}
                </CheckboxCard>
              ))}
            </div>
          </Field>

          {/* Cancellation */}
          <Field label="Cancellation policy" hint={selectedCancellationHelper}>
            <Select value={cancellationPolicy} onValueChange={setCancellationPolicy}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="Select a policy" />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.label} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Visibility */}
          <Field label="Listing type" hint="Private is unlisted. Only people with the link can register.">
            <Select value={visibility} onValueChange={(v) => setVisibility(v as Visibility)}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </FormCard>

    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Schedule renderers                                               */
  /* ---------------------------------------------------------------- */

  /** Render a single camp session's date + time + capacity + price fields */
  const renderCampSessionFields = (session: CampSession, hasMultiple: boolean) => (
    <div className="space-y-4">
      {/* Optional session label — only shown when there are multiple sessions */}
      {hasMultiple && (
        <Field label="Session name (optional)">
          <Input
            value={session.label}
            onChange={(e) => updateCampSession(session.id, { label: e.target.value })}
            placeholder='e.g. "Week 1", "Beginner Track", "Morning Group"'
          />
        </Field>
      )}

      {/* Experience level — per-session when multiple, hidden when single (uses global) */}
      {hasMultiple && (
        <Field label="Experience level" hint="Override the level for this session. If left blank, the level set in Basics applies to all sessions.">
          <div className="flex flex-wrap gap-2">
            {EXPERIENCE_LEVELS.map((lvl) => {
              const active = session.experienceLevel.includes(lvl.value);
              return (
                <button
                  key={lvl.value}
                  type="button"
                  onClick={() => {
                    const next = lvl.value === "all_levels"
                      ? (active ? [] : ["all_levels" as ExperienceLevel])
                      : (active
                          ? session.experienceLevel.filter((v) => v !== lvl.value)
                          : [...session.experienceLevel.filter((v) => v !== "all_levels"), lvl.value as ExperienceLevel]);
                    updateCampSession(session.id, { experienceLevel: next });
                  }}
                  className={`h-8 rounded-lg px-3 text-xs font-semibold transition-colors ${active ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
                >
                  {lvl.label}
                </button>
              );
            })}
          </div>
        </Field>
      )}

      {/* Date field(s) — adapts to dateEntryMode */}
      {dateEntryMode === "range" ? (
        <div className="space-y-1.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Start date">
              <DateInput
                value={session.startDate}
                onChange={(e) =>
                  updateCampSession(session.id, { startDate: e.target.value })
                }
              />
            </Field>
            <Field label="End date">
              <DateInput
                value={session.endDate}
                onChange={(e) =>
                  updateCampSession(session.id, { endDate: e.target.value })
                }
              />
            </Field>
          </div>
          {session.startDate && session.endDate && session.endDate < session.startDate && (
            <p className="text-xs text-destructive">End date must be after start date.</p>
          )}
        </div>
      ) : (
        <Field label="Date">
          <DateInput
            value={session.startDate}
            onChange={(e) =>
              updateCampSession(session.id, {
                startDate: e.target.value,
                endDate: e.target.value,
              })
            }
          />
        </Field>
      )}

      {/* Days of the week */}
      <Field label="Days">
        <div className="flex gap-1.5 flex-wrap">
          {(["sun","mon","tue","wed","thu","fri","sat"] as DayKey[]).map((d) => {
            const label = d.charAt(0).toUpperCase() + d.slice(1, 3);
            const active = session.days.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  const next = active
                    ? session.days.filter((x) => x !== d)
                    : [...session.days, d];
                  updateCampSession(session.id, { days: next });
                }}
                className={`h-9 w-11 rounded-lg text-xs font-semibold transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Field>

      {/* Times row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Start time">
          <TimeSelect
            value={session.startTime}
            onChange={(v) => updateCampSession(session.id, { startTime: v })}
            placeholder="Select time"
          />
        </Field>
        <Field label="End time">
          <TimeSelect
            value={session.endTime}
            onChange={(v) => updateCampSession(session.id, { endTime: v })}
            placeholder="Select time"
          />
        </Field>
      </div>

      {/* Capacity + waitlist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Capacity">
          <Input
            type="number"
            min={1}
            value={session.capacity}
            onChange={(e) =>
              updateCampSession(session.id, { capacity: e.target.value })
            }
            placeholder="e.g. 20"
          />
        </Field>
        <Field label=" ">
          <label className="flex h-11 items-center gap-2 text-sm font-medium cursor-pointer">
            <Checkbox
              checked={session.enableWaitlist}
              onCheckedChange={(checked) =>
                updateCampSession(session.id, { enableWaitlist: checked === true })
              }
            />
            Enable waitlist
          </label>
        </Field>
      </div>

      {/* Price per child */}
      <Field label="Price per child">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground z-10">
            $
          </span>
          <Input
            value={session.priceText}
            onChange={(e) => {
              const next = sanitizeMoneyInput(e.target.value);
              updateCampSession(session.id, {
                priceText: next,
                price_cents: parseMoneyToCents(next),
              });
            }}
            onBlur={() => {
              if (!session.priceText.trim()) return;
              if (session.price_cents == null) {
                updateCampSession(session.id, { priceText: "" });
                return;
              }
              updateCampSession(session.id, {
                priceText: formatCentsToMoneyText(session.price_cents),
              });
            }}
            placeholder="e.g. 450"
            className="pl-8 text-left h-11"
            inputMode="decimal"
            autoComplete="off"
            aria-label="Price per child"
          />
        </div>
      </Field>
    </div>
  );

  /** Unified sessions list used by the new schedule renderer */
  const renderUnifiedSessions = () => {
    const hasMultiple = campSessions.length > 1;
    const addLabel = dateEntryMode === "individual" ? "Add another date" : "Add another session";
    const sessionLabel = (idx: number) =>
      dateEntryMode === "individual" ? `Date ${idx + 1}` : `Session ${idx + 1}`;

    return (
      <div className="space-y-4">
        <div className="rounded-card bg-card overflow-hidden">
          {/* Card title */}
          <div className="px-5 pt-5 pb-1 sm:px-6">
            <p className="text-sm font-semibold text-foreground">When does this activity run?</p>
          </div>

        {campSessions.map((session, idx) => (
          <div key={session.id}>
            {idx > 0 && <div className="border-t border-border" />}

            <div className="px-5 py-5 sm:px-6 space-y-4">
              {/* Session header — only when multiple sessions exist */}
              {hasMultiple && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {sessionLabel(idx)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => copyCampSession(session.id)}
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                      </svg>
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Remove this session? This cannot be undone.")) {
                          removeCampSession(session.id);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] text-destructive hover:bg-destructive/5 transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {renderCampSessionFields(session, hasMultiple)}
            </div>
          </div>
        ))}

        {/* Add session button — inside card, separated by border */}
        <div className="px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={addCampSession}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground/8 hover:bg-foreground/12 px-4 py-2 text-sm font-medium text-foreground transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {addLabel}
          </button>
        </div>
        </div>
      </div>
    );
  };

  /** Icon: copy */
  const IconCopy = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
    </svg>
  );

  /** Icon: plus */
  const IconPlus = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );

  /** Icon: trash */
  const IconTrash = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );

  /** Class schedule — ongoing or session-based with weekly availability */
  const renderClassSchedule = () => (
    <div className="space-y-6">
      {/* Tip banner */}
      <Alert tone="warning" icon="lightbulb">
        <span className="font-medium">New to scheduling?</span>{" "}
        Start with 2–3 availability blocks. You can always add more later as demand grows.
      </Alert>

      {/* Scheduling mode */}
      <FormCard title="Scheduling details" subtitle="Choose how students will book your classes.">
        <div className="grid grid-cols-2 gap-3">
          <div className="relative flex flex-col">
            <RadioCard
              selected={classScheduleMode === "ongoing"}
              onClick={() => { setClassScheduleMode("ongoing"); setActivityKind("class"); }}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm">Ongoing</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOngoingTip((p) => !p);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                </button>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Private lessons, tutoring, and drop-in classes with flexible booking
              </div>
            </RadioCard>
            {/* Tooltip popover + backdrop */}
            {showOngoingTip && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowOngoingTip(false)}
                />
                <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl bg-foreground px-4 py-3 text-xs text-background shadow-lg">
                  <p className="font-medium mb-1">Ongoing</p>
                  <p className="leading-relaxed opacity-80">
                    Best for guitar lessons, math tutoring, or any recurring activity where students book individual time slots from your weekly availability.
                  </p>
                  <div
                    className="absolute -top-1.5 left-8 h-3 w-3 rotate-45 bg-foreground"
                  />
                </div>
              </>
            )}
          </div>
          <div className="relative flex flex-col">
            <RadioCard
              selected={classScheduleMode === "sessions"}
              onClick={() => { setClassScheduleMode("sessions"); setActivityKind("camp"); }}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm">Fixed</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSessionsTip((p) => !p);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                </button>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Week-long programs, class series, or workshops with set dates
              </div>
            </RadioCard>
            {/* Sessions tooltip popover + backdrop */}
            {showSessionsTip && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSessionsTip(false)}
                />
                <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl bg-foreground px-4 py-3 text-xs text-background shadow-lg">
                  <p className="font-medium mb-1">Fixed</p>
                  <p className="leading-relaxed opacity-80">
                    Best for summer camps, coding bootcamps, art classes, or any activity where students enroll in a specific cohort with a set start and end date.
                  </p>
                  <div
                    className="absolute -top-1.5 left-8 h-3 w-3 rotate-45 bg-foreground"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </FormCard>

      {/* ---- ONGOING MODE ---- */}
      {classScheduleMode === "ongoing" && (
        <>
          <FormCard
            title="Weekly availability"
            subtitle="Set when you're available each week."
          >
            {/* Purple tip banner */}
            <div className="mb-4 flex gap-2.5 rounded-lg bg-violet-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-violet-800">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 mt-0.5 text-violet-600" />
              <p>
                You can add multiple time blocks within a day to accommodate
                different schedules. Use the{" "}
                <span className="font-semibold">+</span> icon to add another
                time slot.
              </p>
            </div>
            <div className="space-y-0">
              {DAY_LABELS.map(([dayKey, dayLabelFull]) => {
                const day = classWeekly[dayKey];
                return (
                  <div
                    key={dayKey}
                    className="flex items-start gap-3 border-b border-border/50 py-3 last:border-0 last:pb-0 first:pt-0"
                  >
                    {/* Day label — full name, static, not clickable */}
                    <span className="w-20 shrink-0 pt-2 text-xs font-medium text-foreground">
                      {dayLabelFull}
                    </span>

                    {day.available ? (
                      /* ---- Available: time blocks ---- */
                      <div className="flex-1 space-y-2">
                        {day.blocks.map((block) => (
                          <div key={block.id} className="flex items-center gap-2">
                            <div className="flex-1">
                              <TimeSelect
                                value={block.start}
                                onChange={(v) =>
                                  updateClassTimeBlock(dayKey, block.id, "start", v)
                                }
                                placeholder="Start"
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">–</span>
                            <div className="flex-1">
                              <TimeSelect
                                value={block.end}
                                onChange={(v) =>
                                  updateClassTimeBlock(dayKey, block.id, "end", v)
                                }
                                placeholder="End"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* ---- Unavailable: pink/rose bar ---- */
                      <div className="flex-1">
                        <div className="flex h-11 items-center rounded-lg bg-rose-50 px-3">
                          <span className="text-xs font-medium text-rose-400">
                            Unavailable
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Action icons — always on the right */}
                    <div className="flex items-center gap-0.5 shrink-0 pt-1.5">
                      {day.available ? (
                        <>
                          {/* Disable day (⊘) */}
                          <button
                            type="button"
                            onClick={() => toggleClassDayAvailable(dayKey)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-gray-50 hover:text-foreground transition-colors"
                            title="Disable day"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                          {/* Add time block (+) */}
                          <button
                            type="button"
                            onClick={() => addClassTimeBlock(dayKey)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-gray-50 hover:text-foreground transition-colors"
                            title="Add time block"
                          >
                            <IconPlus />
                          </button>
                          {/* Copy last block */}
                          {day.blocks.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                copyClassTimeBlock(
                                  dayKey,
                                  day.blocks[day.blocks.length - 1].id,
                                )
                              }
                              className="rounded p-1.5 text-muted-foreground hover:bg-gray-50 hover:text-foreground transition-colors"
                              title="Copy time block"
                            >
                              <IconCopy />
                            </button>
                          )}
                        </>
                      ) : (
                        /* Unavailable: only show + to re-enable */
                        <button
                          type="button"
                          onClick={() => toggleClassDayAvailable(dayKey)}
                          className="rounded p-1.5 text-muted-foreground/50 hover:bg-gray-50 hover:text-foreground transition-colors"
                          title="Enable day"
                        >
                          <IconPlus />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </FormCard>

          {/* Class details for ongoing */}
          <FormCard
            title="Class details"
            subtitle="Help families understand the logistics."
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="How long is each class?">
                  <Select value={classDuration} onValueChange={setClassDuration}>
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASS_DURATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="How many students per class?">
                  <Input
                    type="number"
                    min={1}
                    value={classStudentsPerClass}
                    onChange={(e) => setClassStudentsPerClass(e.target.value)}
                    placeholder="e.g. 8"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Price per class">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground z-10">
                      $
                    </span>
                    <Input
                      value={classPricePerClass}
                      onChange={(e) =>
                        setClassPricePerClass(sanitizeMoneyInput(e.target.value))
                      }
                      placeholder="e.g. 35"
                      className="pl-8"
                      inputMode="decimal"
                      autoComplete="off"
                    />
                  </div>
                </Field>

              </div>

              <Field
                label="Enrollment start date"
                hint="Leave blank for rolling enrollment — students join at the next available class"
              >
                <DateInput
                  value={classSessionStartDate}
                  onChange={(e) => setClassSessionStartDate(e.target.value)}
                />
              </Field>
            </div>
          </FormCard>
        </>
      )}

      {/* ---- SESSIONS MODE — uses campSessions (start/end date per session) ---- */}
      {classScheduleMode === "sessions" && renderUnifiedSessions()}
    </div>
  );

  const ACTIVITY_ORDINALS = [
    "First", "Second", "Third", "Fourth", "Fifth",
    "Sixth", "Seventh", "Eighth", "Ninth", "Tenth",
  ];

  const renderDescription = () => (
    <div className="space-y-6">
      {/* Description */}
      <FormCard
        title="Describe your activity"
        subtitle="Help families understand what makes your activity special."
      >
        <div className="space-y-1.5">
          <Textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="2–3 short paragraphs about what makes this activity special."
          />
        </div>
      </FormCard>

      {/* Activities */}
      <FormCard
        title="What will you do?"
        subtitle="Add the activities families can expect."
      >
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              className="rounded-xl border border-input bg-transparent p-4 space-y-3"
            >
              {/* Activity header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {ACTIVITY_ORDINALS[index] ?? `Activity ${index + 1}`} Activity
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => copyActivity(activity.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    aria-label="Copy activity"
                  >
                    <IconCopy className="h-4 w-4" />
                  </button>
                  {/* Only show delete when there are more than 3 — the first
                      three slots are the mandatory minimum */}
                  {activities.length > 3 && (
                    <button
                      type="button"
                      onClick={() => removeActivity(activity.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
                      aria-label="Remove activity"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <Field label="Activity Title">
                <Input
                  value={activity.title}
                  onChange={(e) =>
                    updateActivity(activity.id, { title: e.target.value })
                  }
                  placeholder="e.g. Pottery, Swimming, Archery"
                />
              </Field>

              <Field label="Activity Description">
                <Textarea
                  rows={2}
                  value={activity.description}
                  onChange={(e) =>
                    updateActivity(activity.id, {
                      description: e.target.value,
                    })
                  }
                  placeholder="What will kids do in this activity?"
                />
              </Field>
            </div>
          ))}

          <button
            type="button"
            onClick={addActivity}
            className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-input px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-gray-50 hover:text-foreground transition-colors w-full justify-center"
          >
            <IconPlus className="h-4 w-4" />
            Add activity
          </button>
        </div>
      </FormCard>

      {/* Additional details */}
      <FormCard
        title="Anything else families should know? (Optional)"
        subtitle="What to bring, parking info, dress code — anything helpful."
      >
        <Textarea
          rows={3}
          value={additionalDetails}
          onChange={(e) => setAdditionalDetails(e.target.value)}
          placeholder="e.g. Please bring a water bottle and wear comfortable shoes. Parking is available in Lot B."
        />
      </FormCard>
    </div>
  );

  const renderPhotos = () => (
    <div className="space-y-6">
      <FormCard
        title="Photos"
      >
        <PhotoUploader
          maxPhotos={MAX_PHOTOS}
          items={photoItems}
          onAddFiles={(files) => {
            const remaining = Math.max(0, MAX_PHOTOS - photoItems.length);
            const limited = files.slice(0, remaining);
            if (!limited.length) return;
            const next = [
              ...photoItems,
              ...limited.map((file) => ({
                id: `file:${makeId()}`,
                src: URL.createObjectURL(file),
                origin: "new" as const,
                file,
              })),
            ] as PhotoItem[];
            setPhotoItems(next);
          }}
          onRemove={(id) => {
            setPhotoItems((prev) => {
              const item = prev.find((x) => x.id === id);
              if (item?.origin === "new" && item.src?.startsWith("blob:")) {
                try {
                  URL.revokeObjectURL(item.src);
                } catch {}
              }
              return prev.filter((x) => x.id !== id);
            });
          }}
          onReorder={(next) => setPhotoItems(next)}
        />
      </FormCard>
    </div>
  );

  /** Ongoing mode: weekly availability grid + class details (no inner toggle) */
  const renderOngoingContent = () => (
    <>
      {/* Tip banner */}
      <Alert tone="warning" icon="lightbulb">
        <span className="font-medium">New to scheduling?</span>{" "}
        Start with 2–3 availability blocks. You can always add more later as demand grows.
      </Alert>

      <FormCard
        title="Weekly availability"
        subtitle="Set when you're available each week."
      >
        <div className="mb-5">
          <Field label="How long is each class?">
            <Select value={classDuration} onValueChange={setClassDuration}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {CLASS_DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {/* Purple tip banner */}
        <div className="mb-4 flex gap-2.5 rounded-lg bg-violet-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-violet-800">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 mt-0.5 text-violet-600" />
          <p>
            You can add multiple time blocks within a day to accommodate
            different schedules. Use the{" "}
            <span className="font-semibold">+</span> icon to add another
            time slot.
          </p>
        </div>
        <div className="space-y-0">
          {DAY_LABELS.map(([dayKey, dayLabelFull]) => {
            const day = classWeekly[dayKey];
            return (
              <div
                key={dayKey}
                className="flex items-start gap-3 border-b border-border/50 py-3 last:border-0 last:pb-0 first:pt-0"
              >
                <span className="w-20 shrink-0 pt-2 text-xs font-medium text-foreground">
                  {dayLabelFull}
                </span>

                {day.available ? (
                  <div className="flex-1 space-y-2">
                    {day.blocks.map((block) => (
                      <div key={block.id} className="flex items-center gap-2">
                        <div className="flex-1">
                          <TimeSelect
                            value={block.start}
                            onChange={(v) =>
                              updateClassTimeBlock(dayKey, block.id, "start", v)
                            }
                            placeholder="Start"
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">–</span>
                        <div className="flex-1">
                          <TimeSelect
                            value={block.end}
                            onChange={(v) =>
                              updateClassTimeBlock(dayKey, block.id, "end", v)
                            }
                            placeholder="End"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1">
                    <div className="flex h-11 items-center rounded-lg bg-rose-50 px-3">
                      <span className="text-xs font-medium text-rose-400">
                        Unavailable
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-0.5 shrink-0 pt-1.5">
                  {day.available ? (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleClassDayAvailable(dayKey)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-gray-50 hover:text-foreground transition-colors"
                        title="Disable day"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => addClassTimeBlock(dayKey)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-gray-50 hover:text-foreground transition-colors"
                        title="Add time block"
                      >
                        <IconPlus />
                      </button>
                      {day.blocks.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            copyClassTimeBlock(
                              dayKey,
                              day.blocks[day.blocks.length - 1].id,
                            )
                          }
                          className="rounded p-1.5 text-muted-foreground hover:bg-gray-50 hover:text-foreground transition-colors"
                          title="Copy time block"
                        >
                          <IconCopy />
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleClassDayAvailable(dayKey)}
                      className="rounded p-1.5 text-muted-foreground/50 hover:bg-gray-50 hover:text-foreground transition-colors"
                      title="Enable day"
                    >
                      <IconPlus />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </FormCard>

      <FormCard
        title="Class details"
        subtitle="Help families understand the logistics."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="How many students per class?">
              <Input
                type="number"
                min={1}
                value={classStudentsPerClass}
                onChange={(e) => setClassStudentsPerClass(e.target.value)}
                placeholder="e.g. 8"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Price per class">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground z-10">
                  $
                </span>
                <Input
                  value={classPricePerClass}
                  onChange={(e) =>
                    setClassPricePerClass(sanitizeMoneyInput(e.target.value))
                  }
                  placeholder="e.g. 35"
                  className="pl-8"
                  inputMode="decimal"
                  autoComplete="off"
                />
              </div>
            </Field>

          </div>

          <Field
            label="Enrollment start date"
            hint="Leave blank for rolling enrollment — students join at the next available class"
          >
            <DateInput
              value={classSessionStartDate}
              onChange={(e) => setClassSessionStartDate(e.target.value)}
            />
          </Field>
        </div>
      </FormCard>
    </>
  );

  const renderSchedule = () => {
    // Legacy listings keep the old UI
    if (isLegacyClassListing) return renderClassSchedule();

    const isOngoing = classScheduleMode === "ongoing";

    return (
      <div className="space-y-6">
        {/* ── Single top-level toggle ───────────────────────────── */}
        <FormCard title="Scheduling details" subtitle="Choose how students will book your activity.">
          <div className="grid grid-cols-2 gap-3">

            {/* Camps & Classes */}
            <div className="relative flex flex-col">
              <RadioCard
                selected={!isOngoing}
                onClick={() => { setClassScheduleMode("sessions"); setActivityKind("camp"); setEnrollmentMode("full_program"); setBookingModel("per_session"); }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm">Fixed</span>
                  <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setShowSessionsTip((p) => !p); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setShowSessionsTip((p) => !p); }}} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Week-long programs, class series, or workshops with set dates
                </div>
              </RadioCard>
              {showSessionsTip && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSessionsTip(false)} />
                  <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl bg-foreground px-4 py-3 text-xs text-background shadow-lg">
                    <p className="font-medium mb-1">Fixed</p>
                    <p className="leading-relaxed opacity-80">Best for summer camps, coding bootcamps, art classes, or any activity where students enroll in a specific cohort with a set start and end date.</p>
                    <div className="absolute -top-1.5 left-8 h-3 w-3 rotate-45 bg-foreground" />
                  </div>
                </>
              )}
            </div>

            {/* Lessons & Tutoring */}
            <div className="relative flex flex-col">
              <RadioCard
                selected={isOngoing}
                onClick={() => { setClassScheduleMode("ongoing"); setActivityKind("class"); setEnrollmentMode("choose_sessions"); setBookingModel("per_class"); }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm">Ongoing</span>
                  <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setShowOngoingTip((p) => !p); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setShowOngoingTip((p) => !p); }}} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Private lessons, tutoring, and drop-in classes with flexible booking
                </div>
              </RadioCard>
              {showOngoingTip && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowOngoingTip(false)} />
                  <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl bg-foreground px-4 py-3 text-xs text-background shadow-lg">
                    <p className="font-medium mb-1">Ongoing</p>
                    <p className="leading-relaxed opacity-80">Best for guitar lessons, math tutoring, or any recurring activity where students book individual time slots from your weekly availability.</p>
                    <div className="absolute -top-1.5 left-8 h-3 w-3 rotate-45 bg-foreground" />
                  </div>
                </>
              )}
            </div>

          </div>
        </FormCard>

        {/* ── Content based on mode ─────────────────────────────── */}
        {!isOngoing
          ? renderUnifiedSessions()
          : renderOngoingContent()
        }
      </div>
    );
  };

  const renderDetails = () => (
    <div className="space-y-8">
      {/* Pricing & visibility */}
      <FormCard title="Pricing">
        <div className="space-y-4">
          {isLegacyClassListing && (
            <Field label="Price per child">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground z-10">
                  $
                </span>
                <Input
                  value={priceText}
                  onChange={(e) => {
                    const nextText = sanitizeMoneyInput(e.target.value);
                    setPriceText(nextText);
                    setPriceCents(parseMoneyToCents(nextText));
                  }}
                  onBlur={() => {
                    if (!priceText.trim()) return;
                    if (priceCents == null) {
                      setPriceText("");
                      return;
                    }
                    setPriceText(formatCentsToMoneyText(priceCents));
                  }}
                  placeholder="e.g. 450"
                  className="pl-8 text-left h-11"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-label="Price per child"
                />
              </div>
            </Field>
          )}

        </div>
      </FormCard>

      {/* Add-on Services */}
      <FormCard
        title="Add-on Services (Optional)"
        subtitle="Offer extra convenience for families."
      >
        <div className="space-y-3">
          {/* Early drop-off */}
          <ExpandableCheckboxCard
            checked={offerEarlyDropoff}
            onCheckedChange={setOfferEarlyDropoff}
            title="Early drop-off"
            description="Allow families to drop off their child before the activity starts."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Price per student per day">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground z-10">
                    $
                  </span>
                  <Input
                    value={earlyDropoffPrice}
                    onChange={(e) =>
                      setEarlyDropoffPrice(sanitizeMoneyInput(e.target.value))
                    }
                    placeholder="e.g. 10"
                    className="pl-8"
                    inputMode="decimal"
                    autoComplete="off"
                  />
                </div>
              </Field>
              <Field label="Early drop-off starts at">
                <TimeSelect
                  value={earlyDropoffStart}
                  onChange={setEarlyDropoffStart}
                  placeholder="Select time"
                />
              </Field>
            </div>
            <Tip>
              If your activity starts at 9:00 AM and you set early drop-off
              from 7:30 AM, families can drop off between 7:30–9:00 AM for an
              additional fee.
            </Tip>
          </ExpandableCheckboxCard>

          {/* Extended day */}
          <ExpandableCheckboxCard
            checked={offerExtendedDay}
            onCheckedChange={setOfferExtendedDay}
            title="Extended day"
            description="Let families pick up their child after the activity ends."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Price per student per day">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground z-10">
                    $
                  </span>
                  <Input
                    value={extendedDayPrice}
                    onChange={(e) =>
                      setExtendedDayPrice(sanitizeMoneyInput(e.target.value))
                    }
                    placeholder="e.g. 15"
                    className="pl-8"
                    inputMode="decimal"
                    autoComplete="off"
                  />
                </div>
              </Field>
              <Field label="Extended day ends at">
                <TimeSelect
                  value={extendedDayEnd}
                  onChange={setExtendedDayEnd}
                  placeholder="Select time"
                />
              </Field>
            </div>
            <Tip>
              If your activity ends at 3:00 PM and you set extended day until
              5:30 PM, families can pick up between 3:00–5:30 PM for an
              additional fee.
            </Tip>
          </ExpandableCheckboxCard>

          {/* Custom add-ons */}
          {customAddOns.map((addon, i) => (
            <div key={addon.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Custom fee</p>
                <button
                  type="button"
                  onClick={() => setCustomAddOns(prev => prev.filter((_, j) => j !== i))}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Fee name">
                  <Input
                    value={addon.name}
                    onChange={e => setCustomAddOns(prev => prev.map((a, j) => j === i ? { ...a, name: e.target.value } : a))}
                    placeholder="e.g. Costume fee, Materials kit"
                  />
                </Field>
                <Field label="Price per student">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground z-10">$</span>
                    <Input
                      value={addon.price}
                      onChange={e => setCustomAddOns(prev => prev.map((a, j) => j === i ? { ...a, price: sanitizeMoneyInput(e.target.value) } : a))}
                      placeholder="e.g. 50"
                      className="pl-8"
                      inputMode="decimal"
                      autoComplete="off"
                    />
                  </div>
                </Field>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setCustomAddOns(prev => [...prev, { id: crypto.randomUUID(), name: "", price: "" }])}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <span className="material-symbols-rounded select-none" style={{ fontSize: 18 }}>add_circle</span>
            Add a custom fee
          </button>
        </div>
      </FormCard>

      {/* Discounts */}
      <FormCard
        title="Discounts (Optional)"
        subtitle="Make your activity accessible to more families."
      >
        <ExpandableCheckboxCard
          checked={offerSiblingDiscount}
          onCheckedChange={(checked) => {
            setOfferSiblingDiscount(checked);
            if (!checked) {
              setSiblingDiscountType("none");
              setSiblingDiscountValue("");
              return;
            }
            if (siblingDiscountType === "none")
              setSiblingDiscountType("percent");
          }}
          title="Sibling discount"
          description="Offer a discount when families register more than one child."
        >
          {/* Discount type toggle */}
          <div className="flex gap-3">
            <RadioCard
              selected={siblingDiscountType === "percent"}
              onClick={() => setSiblingDiscountType("percent")}
            >
              <div className="text-sm font-medium">Percentage discount</div>
            </RadioCard>
            <RadioCard
              selected={siblingDiscountType === "amount"}
              onClick={() => setSiblingDiscountType("amount")}
            >
              <div className="text-sm font-medium">Fixed amount discount</div>
            </RadioCard>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label={
                siblingDiscountType === "amount"
                  ? "Discount per additional child"
                  : "Discount percentage"
              }
            >
              <div className="relative">
                {siblingDiscountType === "amount" && (
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground z-10">
                    $
                  </span>
                )}
                <Input
                  type="number"
                  min={0}
                  max={
                    siblingDiscountType === "percent" ? 100 : undefined
                  }
                  value={siblingDiscountValue}
                  onChange={(e) => setSiblingDiscountValue(e.target.value)}
                  placeholder={
                    siblingDiscountType === "percent"
                      ? "e.g. 10"
                      : "e.g. 25"
                  }
                  className={`h-11 ${
                    siblingDiscountType === "amount" ? "pl-8" : ""
                  }`}
                />
                {siblingDiscountType === "percent" && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    %
                  </span>
                )}
              </div>
            </Field>
          </div>

          <Tip>
            {siblingDiscountType === "amount"
              ? `Each additional sibling will receive $${siblingDiscountValue || "X"} off the registration fee.`
              : `Each additional sibling will receive ${siblingDiscountValue || "X"}% off the registration fee.`}
          </Tip>
        </ExpandableCheckboxCard>

        {activityKind === "camp" && campSessions.length >= 2 && (
          <ExpandableCheckboxCard
            checked={offerMultiSessionDiscount}
            onCheckedChange={(checked) => {
              setOfferMultiSessionDiscount(checked);
              if (!checked) setMultiSessionDiscountPercent("");
            }}
            title="Multi-session discount"
            description="Offer a discount when a guest books 2 or more sessions."
          >
            <Field label="Discount percentage">
              <div className="relative">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={multiSessionDiscountPercent}
                  onChange={(e) => setMultiSessionDiscountPercent(e.target.value)}
                  placeholder="e.g. 10"
                  className="pr-8"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
            </Field>
            <Tip>
              Guests save {multiSessionDiscountPercent || "X"}% when they book 2 or more sessions.
            </Tip>
          </ExpandableCheckboxCard>
        )}
      </FormCard>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <FormCard title="Review your activity" subtitle="Make sure everything looks good before publishing.">
        <div className="space-y-5 text-sm">
          <div className="grid grid-cols-[100px,1fr] gap-y-3 gap-x-4">
            <span className="text-xs text-muted-foreground">Type</span>
            <span className="capitalize">{activityKind}</span>

            <span className="text-xs text-muted-foreground">Title</span>
            <span className="font-medium">{title || "—"}</span>

            <span className="text-xs text-muted-foreground">Location</span>
            <span>{locationType === "virtual" ? "Virtual" : location || "—"}</span>

            {locationType === "virtual" && meetingUrl && (
              <>
                <span className="text-xs text-muted-foreground">Meeting link</span>
                <span className="truncate text-xs">{meetingUrl}</span>
              </>
            )}

            {category && (
              <>
                <span className="text-xs text-muted-foreground">Category</span>
                <span>{category}</span>
              </>
            )}

            <span className="text-xs text-muted-foreground">Ages</span>
            <span>
              {ageBuckets.length
                ? ageBuckets.map((b) => AGE_BUCKETS.find((x) => x.value === b)?.label ?? b).join(", ")
                : "Not specified"}
            </span>

            {experienceLevels.length > 0 && (
              <>
                <span className="text-xs text-muted-foreground">Level</span>
                <span className="capitalize">{experienceLevels.map((l) => l.replace("_", " ")).join(", ")}</span>
              </>
            )}

            <span className="text-xs text-muted-foreground">Price</span>
            <span>
              {activityKind === "camp" ? (() => {
                const prices = campSessions
                  .map((s) => s.price_cents)
                  .filter((p): p is number => p != null);
                if (!prices.length) return "Free / not set";
                const lo = Math.min(...prices);
                const hi = Math.max(...prices);
                return lo === hi
                  ? `$${formatCentsToMoneyText(lo)} / session`
                  : `$${formatCentsToMoneyText(lo)}–$${formatCentsToMoneyText(hi)} / session`;
              })() : priceCents != null ? `$${formatCentsToMoneyText(priceCents)}` : "Free / not set"}
            </span>

            <span className="text-xs text-muted-foreground">Schedule</span>
            <span>
              {activityKind === "camp"
                ? `${campSessions.length} session${campSessions.length !== 1 ? "s" : ""}`
                : classScheduleMode === "ongoing"
                  ? "Ongoing"
                  : "Fixed sessions"}
            </span>

            {activityKind === "class" && classDuration && (
              <>
                <span className="text-xs text-muted-foreground">Duration</span>
                <span>
                  {CLASS_DURATION_OPTIONS.find((o) => o.value === classDuration)?.label ?? classDuration}
                </span>
              </>
            )}

            {activityKind === "class" && classStudentsPerClass && (
              <>
                <span className="text-xs text-muted-foreground">Students</span>
                <span>{classStudentsPerClass} per class</span>
              </>
            )}

            {activityKind === "class" && classPricePerClass && (
              <>
                <span className="text-xs text-muted-foreground">Per class</span>
                <span>${classPricePerClass}</span>
              </>
            )}

            {activityKind === "class" && classScheduleMode === "ongoing" && (
              <>
                <span className="text-xs text-muted-foreground">Frequency</span>
                <span>
                  {CLASS_FREQUENCY_OPTIONS.find((o) => o.value === classFrequency)?.label ?? classFrequency}
                </span>
              </>
            )}

            {activityKind === "class" && classScheduleMode === "sessions" && classSessionLength && (
              <>
                <span className="text-xs text-muted-foreground">Session</span>
                <span>
                  {SESSION_LENGTH_OPTIONS.find((o) => o.value === classSessionLength)?.label ?? classSessionLength}
                </span>
              </>
            )}

            {activityKind === "class" && classScheduleMode === "sessions" && classMeetingLength && (
              <>
                <span className="text-xs text-muted-foreground">Meeting</span>
                <span>
                  {MEETING_LENGTH_OPTIONS.find((o) => o.value === classMeetingLength)?.label ?? classMeetingLength}
                </span>
              </>
            )}

            {activityKind === "class" && classScheduleMode === "sessions" && classPricePerMeeting && (
              <>
                <span className="text-xs text-muted-foreground">Per meeting</span>
                <span>${classPricePerMeeting}</span>
              </>
            )}

            <span className="text-xs text-muted-foreground">Visibility</span>
            <span className="capitalize">{visibility}</span>

            <span className="text-xs text-muted-foreground">Photos</span>
            <span>{photoItems.length} photo{photoItems.length !== 1 ? "s" : ""}</span>

            <span className="text-xs text-muted-foreground">Cancellation</span>
            <span>
              {CANCELLATION_OPTIONS.find((o) => o.value === cancellationPolicy)?.label ?? "—"}
            </span>
          </div>

          {/* Camp session summaries */}
          {activityKind === "camp" && campSessions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Sessions</p>
              {campSessions.map((s, i) => (
                <div key={s.id} className="rounded-lg bg-muted/40 px-3 py-2 text-xs">
                  <span className="font-medium">Session {i + 1}</span>
                  {(s.startDate || s.endDate) && (
                    <span className="ml-2 text-muted-foreground">
                      {s.startDate || "?"} – {s.endDate || "?"}
                    </span>
                  )}
                  {(s.startTime || s.endTime) && (
                    <span className="ml-2 text-muted-foreground">
                      {s.startTime ? toAmPmLabel(s.startTime) : "?"} – {s.endTime ? toAmPmLabel(s.endTime) : "?"}
                    </span>
                  )}
                  {s.capacity && (
                    <span className="ml-2 text-muted-foreground">
                      · {s.capacity} spots
                    </span>
                  )}
                  {s.enableWaitlist && (
                    <span className="ml-1 text-muted-foreground">· waitlist</span>
                  )}
                  {s.price_cents != null && (
                    <span className="ml-2 text-muted-foreground">
                      · ${formatCentsToMoneyText(s.price_cents)}
                    </span>
                  )}
                </div>
              ))}
              {offerMultiSessionDiscount && multiSessionDiscountPercent && (
                <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Multi-session discount: {multiSessionDiscountPercent}% off when booking 2+ sessions
                </div>
              )}
            </div>
          )}

          {/* Class weekly availability summary */}
          {activityKind === "class" && classScheduleMode === "ongoing" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Weekly availability</p>
              <div className="space-y-1">
                {DAY_LABELS.map(([dayKey, dayFull]) => {
                  const d = classWeekly[dayKey];
                  if (!d.available) return null;
                  const filledBlocks = d.blocks.filter((b) => b.start || b.end);
                  if (!filledBlocks.length) return null;
                  return (
                    <div key={dayKey} className="text-xs">
                      <span className="inline-block w-20 font-medium">{dayFull}</span>
                      {filledBlocks.map((b, i) => (
                        <span key={b.id} className="text-muted-foreground">
                          {i > 0 && ", "}
                          {b.start ? toAmPmLabel(b.start) : "?"} – {b.end ? toAmPmLabel(b.end) : "?"}
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {description && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="text-sm text-foreground whitespace-pre-line">{description}</p>
            </div>
          )}

          {activities.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Activities</p>
              {activities.map((a, i) => (
                <div key={a.id} className="rounded-lg bg-muted/40 px-3 py-2 text-xs">
                  <span className="font-medium">{a.title || `Activity ${i + 1}`}</span>
                  {a.description && (
                    <span className="ml-2 text-muted-foreground">{a.description}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </FormCard>

      {submitError && (
        <div className="rounded-xl bg-destructive/10 px-4 py-3 text-xs text-destructive">
          {submitError}
        </div>
      )}
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Render: main wizard                                              */
  /* ---------------------------------------------------------------- */

  const stepContent = [renderBasics, renderDescription, renderSchedule, renderPhotos, renderDetails, renderReview];
  const isLastStep = stepIndex === STEPS.length - 1;

  const formContent = (
    <>
        {/* Stepper */}
        <div className="mb-8">
          <Stepper currentIndex={stepIndex} onNavigate={setStepIndex} />
        </div>


        {submitError && stepIndex !== STEPS.length - 1 && (
          <div className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-xs text-destructive">
            {submitError}
          </div>
        )}

        {/* Step content */}
        {stepContent[stepIndex]()}

        {/* Step validation error */}
        {stepError && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <span className="material-symbols-rounded select-none shrink-0" style={{ fontSize: 16 }}>error</span>
            {stepError}
          </div>
        )}

        {/* Bottom navigation */}
        <div className="flex items-center justify-between gap-3 pt-8 pb-4">
          <div>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={stepIndex === 0 ? () => router.push(embedded ? `/host/activities/${activityId}` : "/host/listings") : goBack}
              disabled={submitting || savingDraft}
            >
              ← Back
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {embedded ? (
              <Button
                type="button"
                variant="default"
                size="lg"
                onClick={() => void handleSaveChanges()}
                disabled={submitting || savingDraft}
              >
                {savingDraft ? "Saving…" : "Save changes"}
              </Button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void handleSaveForLater()}
                  disabled={submitting || savingDraft}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {savingDraft ? "Saving…" : "Save for later"}
                </button>

                <Button
                  type="button"
                  variant="default"
                  size="lg"
                  onClick={goNext}
                  disabled={submitting}
                >
                  {submitting
                    ? "Publishing..."
                    : isLastStep
                      ? "Publish"
                      : "Continue"}
                </Button>
              </>
            )}
          </div>
        </div>

      {/* Save for later toast */}
      {savedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-lg">
          <span className="material-symbols-rounded select-none" style={{ fontSize: 16 }}>check</span>
          Draft saved
        </div>
      )}
    </>
  );

  if (embedded) return formContent;

  return (
    <main className="flex-1 min-h-screen">
      <div className="page-container py-8 lg:py-10"><div className="page-grid"><div className="span-8-center">
        {formContent}
      </div></div></div>
    </main>
  );
}
