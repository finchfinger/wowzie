"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { Tent, BookOpen, Lightbulb, CalendarDays } from "lucide-react";

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
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  capacity: string;
  enableWaitlist: boolean;
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

const buildQuarterHourOptions = () => {
  const options: Array<{ value: string; label: string }> = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
    const hh = Math.floor(minutes / 60);
    const mm = minutes % 60;
    const value = `${pad2(hh)}:${pad2(mm)}`;
    options.push({ value, label: toAmPmLabel(value) });
  }
  return options;
};

const TIME_OPTIONS = buildQuarterHourOptions();

function TimeSelect({
  id,
  value,
  onChange,
  placeholder = "Select time",
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className="h-11 w-full text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {TIME_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const CANCELLATION_OPTIONS: Array<{
  value: string;
  label: string;
  helper: string;
}> = [
  {
    value: "Cancel at least 1 day before the start time for a full refund.",
    label: "Flexible",
    helper: "Full refund up to 24 hours before start time.",
  },
  {
    value: "Cancel at least 7 days before the start time for a full refund.",
    label: "Moderate",
    helper: "Full refund up to 7 days before start time.",
  },
  {
    value: "Cancel at least 14 days before the start time for a full refund.",
    label: "Firm",
    helper: "Full refund up to 14 days before start time.",
  },
  {
    value:
      "All sales are final. If you can't attend, message the host to ask about a credit or transfer.",
    label: "Strict",
    helper: "No guaranteed refunds.",
  },
];

const CATEGORIES = [
  "Arts & crafts",
  "Sports & fitness",
  "Music & dance",
  "STEM & technology",
  "Nature & outdoor",
  "Cooking & baking",
  "Language & culture",
  "Academic tutoring",
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
  start: "",
  end: "",
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
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  capacity: "",
  enableWaitlist: false,
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
  onNavigate,
}: {
  currentIndex: number;
  onNavigate: (index: number) => void;
}) {
  return (
    <nav className="w-full" aria-label="Progress">
      {/* Line + dots row */}
      <div className="relative flex items-center justify-between">
        {/* Background track */}
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-border" />
        {/* Filled track */}
        {currentIndex > 0 && (
          <div
            className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-foreground transition-all"
            style={{ width: `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
          />
        )}

        {STEPS.map((step, i) => {
          const isActive = i === currentIndex;
          const isDone = i < currentIndex;
          const isClickable = isDone; // can jump back to any completed step
          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center">
              <button
                type="button"
                onClick={() => isClickable && onNavigate(i)}
                disabled={!isClickable}
                aria-current={isActive ? "step" : undefined}
                className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                  isDone
                    ? "bg-foreground text-background cursor-pointer hover:opacity-80"
                    : isActive
                      ? "bg-foreground text-background cursor-default"
                      : "border-2 border-border bg-background text-muted-foreground cursor-default"
                }`}
              >
                {isDone ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-[11px] font-semibold">{i + 1}</span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Labels row */}
      <div className="mt-2 flex justify-between">
        {STEPS.map((step, i) => {
          const isActive = i === currentIndex;
          const isDone = i < currentIndex;
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => isDone && onNavigate(i)}
              disabled={!isDone}
              className={`text-[11px] font-medium transition-colors ${
                isActive
                  ? "text-foreground cursor-default"
                  : isDone
                    ? "text-foreground hover:text-primary cursor-pointer"
                    : "text-muted-foreground cursor-default"
              }`}
            >
              {step.label}
            </button>
          );
        })}
      </div>
    </nav>
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
      <button
        type="button"
        onClick={() => onCheckedChange(!checked)}
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
      </button>

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
    <div className="flex gap-2.5 rounded-lg bg-blue-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-blue-800">
      <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-600" />
      <p>{children}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Props for edit mode                                                */
/* ------------------------------------------------------------------ */

export type CreateActivityPageProps = {
  activityId?: string | null;
};

/* ------------------------------------------------------------------ */
/* Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function CreateActivityPage({
  activityId: propActivityId,
}: CreateActivityPageProps = {}) {
  const router = useRouter();

  const activityId = propActivityId ?? null;
  const isEditMode = Boolean(activityId);

  /* Step state */
  const [stepIndex, setStepIndex] = useState(0);

  /* Basics */
  const [activityKind, setActivityKind] = useState<ActivityKind>("camp");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
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

  /* Sibling discount */
  const [offerSiblingDiscount, setOfferSiblingDiscount] = useState(false);
  const [siblingDiscountType, setSiblingDiscountType] =
    useState<SiblingDiscountType>("none");
  const [siblingDiscountValue, setSiblingDiscountValue] = useState("");

  /* Submit / load state */
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
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
          "id, slug, name, description, location, price_cents, is_published, hero_image_url, image_urls, meta, start_local, end_local, schedule_tz, start_time, end_time",
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

      if (data.price_cents != null) {
        setPriceCents(data.price_cents);
        setPriceText(formatCentsToMoneyText(data.price_cents));
      } else {
        setPriceCents(null);
        setPriceText("");
      }

      setVisibility(
        meta.visibility ?? (data.is_published ? "public" : "private"),
      );
      setIsVirtual(Boolean(meta.isVirtual));
      if (meta.isVirtual) setLocationType("virtual");
      if (meta.meetingUrl) setMeetingUrl(meta.meetingUrl);
      setActivityType(meta.activityType ?? "fixed");
      if (meta.activityKind) setActivityKind(meta.activityKind);
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

      /* Camp sessions */
      if (Array.isArray(meta.campSessions) && meta.campSessions.length) {
        setCampSessions(meta.campSessions);
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
      campSessions: activityKind === "camp" ? campSessions : undefined,
      classSchedule:
        activityKind === "class"
          ? {
              mode: classScheduleMode,
              weekly: classWeekly,
              duration: classDuration || undefined,
              studentsPerClass: classStudentsPerClass || undefined,
              pricePerClass: classPricePerClass || undefined,
              frequency: classFrequency,
              sessionLength: classSessionLength || undefined,
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
      },
      pricing: {
        price_cents: priceCents ?? null,
        display: priceText || null,
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
    const scheduleTz = "America/Chicago";

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

    const payload = {
      name: title.trim(),
      slug,
      description: description || null,
      location: locationType === "virtual" ? "Virtual" : location || null,
      price_cents: priceCents,
      host_id: hostId,
      is_published: visibility === "public",
      is_active: true,
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

    let savedId = activityId ?? null;

    if (isEditMode && activityId) {
      const { data, error } = await supabase
        .from("camps")
        .update(payload)
        .eq("id", activityId)
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

    if (priceText.trim() && priceCents === null) {
      setSubmitError("Please enter a valid price (for example 450 or 450.00).");
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

  const handleSaveForLater = () => {
    router.push("/host");
  };

  /* ---------------------------------------------------------------- */
  /* Navigation                                                       */
  /* ---------------------------------------------------------------- */

  const goNext = () => {
    if (stepIndex < STEPS.length - 1) setStepIndex(stepIndex + 1);
    else void handleSubmit();
  };

  const goBack = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  /* ---------------------------------------------------------------- */
  /* Render: loading / error states                                   */
  /* ---------------------------------------------------------------- */

  if (initialLoading) {
    return (
      <main className="flex-1 min-h-screen">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 lg:py-12 text-xs text-muted-foreground">
          Loading activity...
        </div>
      </main>
    );
  }

  if (initialError) {
    return (
      <main className="flex-1 min-h-screen">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 lg:py-12">
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
        </div>
      </main>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Step content                                                     */
  /* ---------------------------------------------------------------- */

  const renderBasics = () => (
    <div className="space-y-6">
      {/* Activity type */}
      <FormCard title="What kind of activity is this?">
        <div className="grid grid-cols-2 gap-3">
          <RadioCard selected={activityKind === "camp"} onClick={() => setActivityKind("camp")}>
            <Tent className="h-5 w-5 mb-1 text-muted-foreground" />
            <div className="font-semibold">Camp</div>
            <div className="text-xs text-muted-foreground mt-0.5">Multi-day program with fixed dates</div>
          </RadioCard>
          <RadioCard selected={activityKind === "class"} onClick={() => setActivityKind("class")}>
            <BookOpen className="h-5 w-5 mb-1 text-muted-foreground" />
            <div className="font-semibold">Class</div>
            <div className="text-xs text-muted-foreground mt-0.5">Recurring lessons or one-time workshops</div>
          </RadioCard>
        </div>
      </FormCard>

      {/* Basics card */}
      <FormCard title="Let's fill in the basics" subtitle="This information helps families find and understand your activity.">
        <div className="space-y-4">
          {/* Title */}
          <Field label="Title" required>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your activity a clear name"
              className="h-11"
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
                  className="h-11"
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
              <SelectTrigger className="h-11 w-full text-sm">
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
              <SelectTrigger className="h-11 w-full text-sm">
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
        </div>
      </FormCard>

    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Schedule renderers                                               */
  /* ---------------------------------------------------------------- */

  /** Render a single camp session's form fields */
  const renderCampSessionFields = (session: CampSession) => (
    <div className="space-y-4">
      {/* Dates row */}
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

      {/* Times row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Daily start time">
          <TimeSelect
            value={session.startTime}
            onChange={(v) =>
              updateCampSession(session.id, { startTime: v })
            }
            placeholder="Select time"
          />
        </Field>
        <Field label="Daily end time">
          <TimeSelect
            value={session.endTime}
            onChange={(v) =>
              updateCampSession(session.id, { endTime: v })
            }
            placeholder="Select time"
          />
        </Field>
      </div>

      {/* Capacity + waitlist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
        <Field label="Capacity">
          <Input
            type="number"
            min={1}
            value={session.capacity}
            onChange={(e) =>
              updateCampSession(session.id, { capacity: e.target.value })
            }
            placeholder="e.g. 20"
            className="h-11"
          />
        </Field>
        <div className="pb-1">
          <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
            <Checkbox
              checked={session.enableWaitlist}
              onCheckedChange={(checked) =>
                updateCampSession(session.id, {
                  enableWaitlist: checked === true,
                })
              }
            />
            Enable waitlist
          </label>
        </div>
      </div>
    </div>
  );

  /** Camp schedule — session-based */
  const renderCampSchedule = () => {
    const hasMultiple = campSessions.length > 1;

    return (
      <div className="space-y-6">
        {/* Single session — clean card without session header */}
        {!hasMultiple && campSessions[0] && (
          <FormCard
            title="When does this camp run?"
            subtitle="Set the dates, times, and capacity for your camp session."
          >
            {renderCampSessionFields(campSessions[0])}
          </FormCard>
        )}

        {/* Multiple sessions — each in its own card with header + actions */}
        {hasMultiple &&
          campSessions.map((session, idx) => (
            <FormCard
              key={session.id}
              title={`Session ${idx + 1}`}
              subtitle={
                idx === 0
                  ? "Each session has its own dates, times, and capacity."
                  : undefined
              }
            >
              <div className="space-y-4">
                {/* Session actions */}
                <div className="flex items-center gap-1 justify-end -mt-1">
                  <button
                    type="button"
                    onClick={() => copyCampSession(session.id)}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-gray-50 hover:text-foreground transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                    </svg>
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCampSession(session.id)}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                    Remove
                  </button>
                </div>

                {renderCampSessionFields(session)}
              </div>
            </FormCard>
          ))}

        {/* Add session button */}
        <button
          type="button"
          onClick={addCampSession}
          className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-input px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-gray-50 hover:text-foreground transition-colors w-full justify-center"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Another Session
        </button>
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
      <div className="flex gap-3 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-900">
        <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
        <p>
          <span className="font-medium">New to scheduling?</span>{" "}
          Start with 2–3 availability blocks. You can always add more later
          as demand grows.
        </p>
      </div>

      {/* Scheduling mode */}
      <FormCard title="Scheduling details" subtitle="Choose how students will book your classes.">
        <div className="grid grid-cols-2 gap-3">
          <div className="relative flex flex-col">
            <RadioCard
              selected={classScheduleMode === "ongoing"}
              onClick={() => setClassScheduleMode("ongoing")}
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
                Recurring weekly availability
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
                  <p className="font-medium mb-1">Ongoing classes</p>
                  <p className="leading-relaxed opacity-80">
                    Best for private lessons, tutoring, consultations, and
                    recurring group classes. Students can join or drop at any time.
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
              onClick={() => setClassScheduleMode("sessions")}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm">Sessions</span>
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
                Fixed-length class series
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
                  <p className="font-medium mb-1">Session-based classes</p>
                  <p className="leading-relaxed opacity-80">
                    Great for workshops, boot camps, and limited-run series.
                    Students commit to a fixed number of weeks with set meeting
                    times.
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
                    <SelectTrigger className="h-11 w-full text-sm">
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
                    className="h-11"
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
                      className="pl-8 h-11"
                      inputMode="decimal"
                      autoComplete="off"
                    />
                  </div>
                </Field>

                <Field label="Frequency">
                  <Select
                    value={classFrequency}
                    onValueChange={(v) => setClassFrequency(v as ClassFrequency)}
                  >
                    <SelectTrigger className="h-11 w-full text-sm">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASS_FREQUENCY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>
          </FormCard>
        </>
      )}

      {/* ---- SESSIONS MODE ---- */}
      {classScheduleMode === "sessions" && (
        <>
          {/* Session overview */}
          <FormCard
            title="Session overview"
            subtitle="Define the structure of your class session."
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Start date">
                  <DateInput
                    value={classSessionStartDate}
                    onChange={(e) => setClassSessionStartDate(e.target.value)}
                  />
                </Field>
                <Field label="Session length">
                  <Select value={classSessionLength} onValueChange={setClassSessionLength}>
                    <SelectTrigger className="h-11 w-full text-sm">
                      <SelectValue placeholder="Select length" />
                    </SelectTrigger>
                    <SelectContent>
                      {SESSION_LENGTH_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Meeting length">
                  <Select value={classMeetingLength} onValueChange={setClassMeetingLength}>
                    <SelectTrigger className="h-11 w-full text-sm">
                      <SelectValue placeholder="Select length" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEETING_LENGTH_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Price per meeting">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground z-10">
                      $
                    </span>
                    <Input
                      value={classPricePerMeeting}
                      onChange={(e) =>
                        setClassPricePerMeeting(sanitizeMoneyInput(e.target.value))
                      }
                      placeholder="e.g. 25"
                      className="pl-8 h-11"
                      inputMode="decimal"
                      autoComplete="off"
                    />
                  </div>
                </Field>
              </div>
            </div>
          </FormCard>

          {/* Weekly time options — sections */}
          <FormCard
            title="Weekly time options"
            subtitle="Add the days and times your class meets."
          >
            <div className="space-y-4">
              {classSections.map((section, idx) => (
                <div key={section.id} className="space-y-3">
                  {idx > 0 && <div className="border-t border-border" />}

                  {/* Section header with actions */}
                  {classSections.length > 1 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        Section {idx + 1}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => copyClassSection(section.id)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-gray-50 hover:text-foreground transition-colors"
                        >
                          <IconCopy />
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => removeClassSection(section.id)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-destructive hover:bg-destructive/5 transition-colors"
                        >
                          <IconTrash />
                          Remove
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Day">
                      <Select
                        value={section.day}
                        onValueChange={(v) =>
                          updateClassSection(section.id, { day: v as DayKey })
                        }
                      >
                        <SelectTrigger className="h-11 w-full text-sm">
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          {DAY_SELECT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Capacity">
                      <Input
                        type="number"
                        min={1}
                        value={section.capacity}
                        onChange={(e) =>
                          updateClassSection(section.id, {
                            capacity: e.target.value,
                          })
                        }
                        placeholder="e.g. 12"
                        className="h-11"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Start time">
                      <TimeSelect
                        value={section.startTime}
                        onChange={(v) =>
                          updateClassSection(section.id, { startTime: v })
                        }
                        placeholder="Select time"
                      />
                    </Field>
                    <Field label="End time">
                      <TimeSelect
                        value={section.endTime}
                        onChange={(v) =>
                          updateClassSection(section.id, { endTime: v })
                        }
                        placeholder="Select time"
                      />
                    </Field>
                  </div>
                </div>
              ))}

              {/* Add another section */}
              <button
                type="button"
                onClick={addClassSection}
                className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-input px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-gray-50 hover:text-foreground transition-colors w-full justify-center"
              >
                <IconPlus className="h-4 w-4" />
                Add Another Section
              </button>
            </div>
          </FormCard>
        </>
      )}
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
        title="Describe your camp"
        subtitle="Help families understand what makes your camp special."
      >
        <div className="space-y-1.5">
          <Textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="2–3 short paragraphs about what makes this camp special."
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
                  className="h-11"
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

  const renderSchedule = () =>
    activityKind === "camp" ? renderCampSchedule() : renderClassSchedule();

  const renderDetails = () => (
    <div className="space-y-8">
      {/* Pricing & visibility */}
      <FormCard title="Pricing &amp; visibility">
        <div className="space-y-4">
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

          <Field
            label="Visibility"
            hint="Private is unlisted. Only people with the link can register."
          >
            <Select
              value={visibility}
              onValueChange={(v) => setVisibility(v as Visibility)}
            >
              <SelectTrigger className="h-11 w-full text-sm">
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          </Field>
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
                    className="pl-8 h-11"
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
                    className="pl-8 h-11"
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
              selected={
                siblingDiscountType === "percent" ||
                siblingDiscountType === "none"
              }
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
            <span>{priceCents != null ? `$${formatCentsToMoneyText(priceCents)}` : "Free / not set"}</span>

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
                </div>
              ))}
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

  return (
    <main className="flex-1 min-h-screen">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 lg:py-10">
        {/* Stepper */}
        <div className="mb-8">
          <Stepper currentIndex={stepIndex} onNavigate={setStepIndex} />
        </div>

        {/* Step header */}
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isEditMode
              ? "Edit your activity"
              : stepIndex === 0
                ? "Let's set up your activity"
                : stepIndex === 1
                  ? "Describe your activity"
                  : stepIndex === 2
                    ? activityKind === "camp"
                      ? "Set your camp schedule"
                      : "Set your class schedule"
                    : stepIndex === 3
                      ? "Add photos"
                      : stepIndex === 4
                        ? "Add the details"
                        : "Almost done!"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            {isEditMode
              ? "Update the details so families always have the most accurate information."
              : stepIndex === 0
                ? "Fill out the basics so families know what you offer."
                : stepIndex === 1
                  ? "Share what makes your activity special and what kids will do."
                  : stepIndex === 2
                    ? activityKind === "camp"
                      ? "Add sessions with dates, times, and capacity for your camp."
                      : "Set your weekly availability and class logistics."
                    : stepIndex === 3
                      ? "Great photos help families get excited about your activity."
                      : stepIndex === 4
                        ? "Add pricing, visibility, and any extra add-ons."
                        : "Review everything and publish when you're ready."}
          </p>
        </header>

        {submitError && stepIndex !== STEPS.length - 1 && (
          <div className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-xs text-destructive">
            {submitError}
          </div>
        )}

        {/* Step content */}
        {stepContent[stepIndex]()}

        {/* Bottom navigation */}
        <div className="flex items-center justify-between gap-3 pt-8 pb-4">
          <div>
            {stepIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={goBack}
                disabled={submitting}
              >
                ← Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveForLater}
              disabled={submitting}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Save for later
            </button>

            <Button
              type="button"
              variant="default"
              size="lg"
              onClick={goNext}
              disabled={submitting}
            >
              {submitting
                ? isEditMode
                  ? "Saving..."
                  : "Creating..."
                : isLastStep
                  ? isEditMode
                    ? "Save changes"
                    : "Create event"
                  : "Continue →"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
