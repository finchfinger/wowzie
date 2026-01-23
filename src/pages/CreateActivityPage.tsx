// src/pages/CreateActivityPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { uploadActivityImages } from "../lib/images";

import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Checkbox } from "../components/ui/Checkbox";
import { DateInput } from "../components/ui/DateInput";
import { MultiSelect } from "../components/ui/MultiSelect";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../components/ui/Select";

import { PhotoUploader, type PhotoItem } from "../components/host/PhotoUploader";

type Visibility = "private" | "public";
type ActivityType = "fixed" | "ongoing";

type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

type DaySchedule = {
  start: string;
  end: string;
};

type SiblingDiscountType = "none" | "percent" | "amount";
type AgeBucket = "all" | "3-5" | "6-8" | "9-12" | "13+";

type CampMeta = {
  visibility?: Visibility;
  isVirtual?: boolean;
  activityType?: ActivityType;

  cancellation_policy?: string | null;

  // New multi-select support
  age_buckets?: AgeBucket[];

  // Legacy compatibility
  age_bucket?: AgeBucket;
  min_age?: number | null;
  max_age?: number | null;

  fixedSchedule?: {
    startDate?: string | null;
    endDate?: string | null;
    startTime?: string | null; // "HH:MM"
    endTime?: string | null; // "HH:MM"
    allDay?: boolean;
    repeatRule?: string;
  };

  ongoingSchedule?: {
    startDate?: string | null;
    endDate?: string | null;
  };

  weeklySchedule?: Record<DayKey, DaySchedule>;

  advanced?: {
    earlyDropoff?: {
      enabled?: boolean;
      price?: string | null;
      start?: string | null; // "HH:MM"
      end?: string | null; // "HH:MM"
    };
    extendedDay?: {
      enabled?: boolean;
      price?: string | null;
      start?: string | null; // "HH:MM"
      end?: string | null; // "HH:MM"
    };
    siblingDiscount?: {
      enabled?: boolean;
      type?: SiblingDiscountType;
      value?: string | null;

      // legacy support
      price?: string | null;
    };
  };

  pricing?: {
    price_cents?: number | null;
    display?: string | null;
    currency?: string;
  };
};

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

type TimeSelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

const TimeSelect: React.FC<TimeSelectProps> = ({
  id,
  value,
  onChange,
  placeholder = "Select time",
  disabled,
}) => {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className="h-11 text-sm">
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
};

const CANCELLATION_OPTIONS: Array<{ value: string; label: string; helper: string }> = [
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
      "All sales are final. If you can’t attend, message the host to ask about a credit or transfer.",
    label: "Strict",
    helper: "No guaranteed refunds.",
  },
];

const AGE_BUCKETS: Array<{ value: AgeBucket; label: string }> = [
  { value: "all", label: "All ages" },
  { value: "3-5", label: "Ages 3 to 5" },
  { value: "6-8", label: "Ages 6 to 8" },
  { value: "9-12", label: "Ages 9 to 12" },
  { value: "13+", label: "Ages 13+" },
];

const AGE_BUCKET_SET = new Set<AgeBucket>(AGE_BUCKETS.map((b) => b.value));
const isAgeBucket = (v: string): v is AgeBucket => AGE_BUCKET_SET.has(v as AgeBucket);

const normalizeAgeBuckets = (vals: AgeBucket[]): AgeBucket[] => {
  if (!vals.length) return [];
  if (vals.includes("all")) return ["all"];
  return vals.filter((v) => v !== "all");
};

const ageBucketToMinMax = (bucket: AgeBucket): { min: number | null; max: number | null } => {
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
  buckets: AgeBucket[]
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
  const finiteMaxs = maxs.filter((m): m is number => typeof m === "number");
  const max = hasOpenEnded ? null : finiteMaxs.length ? Math.max(...finiteMaxs) : null;

  return { min, max };
};

const MAX_PHOTOS = 9;

const makeId = () => {
  try {
    // @ts-ignore
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

// Money helpers
const parseMoneyToCents = (raw: string): number | null => {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;

  const parts = cleaned.split(".");
  const dollarsPart = parts[0] ?? "0";
  const decimalsPart = (parts[1] ?? "").slice(0, 2);

  const dollars = Number.parseInt(dollarsPart || "0", 10);
  if (Number.isNaN(dollars)) return null;

  const cents = Number.parseInt(decimalsPart.padEnd(2, "0") || "0", 10);
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
    v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, "");
    const [a, b] = v.split(".");
    v = `${a}.${(b ?? "").slice(0, 2)}`;
  }
  return v;
};

type UploadedImagesResult = {
  heroUrl?: string | null;
  galleryUrls?: Array<string | null | undefined> | null;
};

const CreateActivityPage: React.FC = () => {
  const navigate = useNavigate();

  const params = useParams<{ id?: string; activityId?: string }>();
  const activityId = params.id ?? params.activityId ?? null;
  const isEditMode = Boolean(activityId);

  // Basics
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [isVirtual, setIsVirtual] = useState(false);
  const [description, setDescription] = useState("");

  // Money
  const [priceText, setPriceText] = useState("");
  const [priceCents, setPriceCents] = useState<number | null>(null);

  // Age buckets + cancellation
  const [ageBuckets, setAgeBuckets] = useState<AgeBucket[]>([]);
  const [cancellationPolicy, setCancellationPolicy] = useState<string>(
    CANCELLATION_OPTIONS[0]?.value ?? ""
  );

  // Photos
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [originalExistingUrls, setOriginalExistingUrls] = useState<string[]>([]);

  // Scheduling type
  const [activityType, setActivityType] = useState<ActivityType>("fixed");

  // Fixed schedule
  const [fixedStartDate, setFixedStartDate] = useState("");
  const [fixedEndDate, setFixedEndDate] = useState("");
  const [fixedStartTime, setFixedStartTime] = useState("");
  const [fixedEndTime, setFixedEndTime] = useState("");
  const [fixedAllDay, setFixedAllDay] = useState(false);
  const [fixedRepeatRule, setFixedRepeatRule] = useState("none");

  // Ongoing schedule
  const [ongoingStartDate, setOngoingStartDate] = useState("");
  const [ongoingEndDate, setOngoingEndDate] = useState("");
  const [showAdvancedAvailability, setShowAdvancedAvailability] = useState(false);

  const [weeklySchedule, setWeeklySchedule] = useState<Record<DayKey, DaySchedule>>({
    sun: { start: "", end: "" },
    mon: { start: "", end: "" },
    tue: { start: "", end: "" },
    wed: { start: "", end: "" },
    thu: { start: "", end: "" },
    fri: { start: "", end: "" },
    sat: { start: "", end: "" },
  });

  const updateDaySchedule = (day: DayKey, field: "start" | "end", value: string) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  // Advanced controls
  const [offerEarlyDropoff, setOfferEarlyDropoff] = useState(false);
  const [earlyDropoffPrice, setEarlyDropoffPrice] = useState("");
  const [earlyDropoffStart, setEarlyDropoffStart] = useState("");
  const [earlyDropoffEnd, setEarlyDropoffEnd] = useState("");

  const [offerExtendedDay, setOfferExtendedDay] = useState(false);
  const [extendedDayPrice, setExtendedDayPrice] = useState("");
  const [extendedDayStart, setExtendedDayStart] = useState("");
  const [extendedDayEnd, setExtendedDayEnd] = useState("");

  // Sibling discount
  const [offerSiblingDiscount, setOfferSiblingDiscount] = useState(false);
  const [siblingDiscountType, setSiblingDiscountType] = useState<SiblingDiscountType>("none");
  const [siblingDiscountValue, setSiblingDiscountValue] = useState("");

  // Submit / load state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [existingSlug, setExistingSlug] = useState<string | null>(null);

  const selectedCancellationHelper = useMemo(() => {
    const found = CANCELLATION_OPTIONS.find((o) => o.value === cancellationPolicy);
    return found?.helper ?? "";
  }, [cancellationPolicy]);

  // Cleanup object URLs for new items when unmounting
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

  // Load existing camp in edit mode
  useEffect(() => {
    if (!isEditMode || !activityId) return;

    let isMounted = true;

    const loadCamp = async () => {
      setInitialLoading(true);
      setInitialError(null);

      const { data, error } = await supabase
        .from("camps")
        .select(
          "id, slug, name, description, location, price_cents, is_published, hero_image_url, image_urls, meta"
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

      setVisibility(meta.visibility ?? (data.is_published ? "public" : "private"));
      setIsVirtual(Boolean(meta.isVirtual));
      setActivityType(meta.activityType ?? "fixed");

      // Age buckets
      if (Array.isArray(meta.age_buckets) && meta.age_buckets.length) {
        setAgeBuckets(normalizeAgeBuckets(meta.age_buckets));
      } else if (meta.age_bucket) {
        setAgeBuckets(meta.age_bucket === "all" ? [] : [meta.age_bucket]);
      } else {
        const min = meta.min_age ?? null;
        const max = meta.max_age ?? null;

        if (min === 3 && max === 5) setAgeBuckets(["3-5"]);
        else if (min === 6 && max === 8) setAgeBuckets(["6-8"]);
        else if (min === 9 && max === 12) setAgeBuckets(["9-12"]);
        else if (min === 13 && max == null) setAgeBuckets(["13+"]);
        else setAgeBuckets([]);
      }

      // Cancellation
      setCancellationPolicy(
        (meta.cancellation_policy && String(meta.cancellation_policy)) ||
          (CANCELLATION_OPTIONS[0]?.value ?? "")
      );

      // Schedules
      const fixed = meta.fixedSchedule || {};
      setFixedStartDate(fixed.startDate ?? "");
      setFixedEndDate(fixed.endDate ?? "");
      setFixedStartTime(fixed.startTime ?? "");
      setFixedEndTime(fixed.endTime ?? "");
      setFixedAllDay(Boolean(fixed.allDay));
      setFixedRepeatRule(fixed.repeatRule ?? "none");

      const ongoing = meta.ongoingSchedule || {};
      setOngoingStartDate(ongoing.startDate ?? "");
      setOngoingEndDate(ongoing.endDate ?? "");

      if (meta.weeklySchedule) {
        setWeeklySchedule((prev) => ({
          ...prev,
          ...meta.weeklySchedule!,
        }));
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

      // Sibling discount loader (new + legacy)
      const legacyPrice = (sib as any).price as string | undefined;
      const loadedEnabled = Boolean(sib.enabled);
      const loadedType: SiblingDiscountType = sib.type ?? (loadedEnabled ? "amount" : "none");

      setOfferSiblingDiscount(loadedEnabled);
      setSiblingDiscountType(loadedEnabled ? loadedType : "none");
      setSiblingDiscountValue((sib.value ?? legacyPrice ?? "") as string);

      // Photos -> single ordered list:
      const existingHero = data.hero_image_url ?? null;
      const existingGallery = (((data.image_urls as string[]) || []) as string[]) || [];
      const allExisting = [...(existingHero ? [existingHero] : []), ...existingGallery].filter(
        Boolean
      ) as string[];

      setOriginalExistingUrls(allExisting);

      setPhotoItems(
        allExisting.slice(0, MAX_PHOTOS).map((url) => ({
          id: `url:${url}`,
          src: url,
          origin: "existing",
          url,
        }))
      );

      setInitialLoading(false);
    };

    void loadCamp();

    return () => {
      isMounted = false;
    };
  }, [isEditMode, activityId]);

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

    // Legacy: if only one selected bucket, store it. Otherwise store "all".
    // NOTE: if ageBuckets is empty, legacyAgeBucket becomes "all" but min/max will be null/null.
    const legacyAgeBucket: AgeBucket = ageBuckets.length === 1 ? ageBuckets[0] : "all";

    const effectiveSiblingType: SiblingDiscountType = offerSiblingDiscount
      ? siblingDiscountType === "none"
        ? "percent"
        : siblingDiscountType
      : "none";

    const meta: CampMeta = {
      visibility,
      isVirtual,
      activityType,

      cancellation_policy: cancellationPolicy || null,

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
    };

    const slug = existingSlug ?? slugify(title);

    // Photos: ordered list; first is primary
    const ordered = photoItems.slice(0, MAX_PHOTOS);
    const primary = ordered[0] ?? null;

    const primaryNewFile = primary?.origin === "new" ? (primary.file ?? null) : null;

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

    // Replace new items with uploaded urls, preserving order
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

    // Optional: infer removed existing urls (for future cleanup)
    const currentExistingUrls = ordered
      .filter((x) => x.origin === "existing")
      .map((x) => x.url ?? x.src)
      .filter(isNonEmptyString);

    const removedExisting = originalExistingUrls.filter((u) => !currentExistingUrls.includes(u));
    void removedExisting;

    const payload = {
      name: title.trim(),
      slug,
      description: description || null,
      location: location || null,
      price_cents: priceCents,
      host_id: hostId,
      is_published: visibility === "public",
      is_active: true,
      hero_image_url: heroUrl,
      image_urls: galleryUrls.length ? galleryUrls : null,
      image_url: primaryCardUrl,
      meta,
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

    if (savedId) navigate(`/host/activities/${savedId}`);
    else navigate("/host/listings");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!title.trim()) {
      setSubmitError("Please add a title for your activity.");
      return;
    }

    if (priceText.trim() && priceCents === null) {
      setSubmitError("Please enter a valid price (for example 450 or 450.00).");
      return;
    }

    setSubmitting(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
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

  const handleSaveForLater = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/host");
  };

  if (initialLoading) {
    return (
      <main className="flex-1 min-h-screen bg-violet-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 lg:py-12 text-xs text-gray-500">
          Loading activity…
        </div>
      </main>
    );
  }

  if (initialError) {
    return (
      <main className="flex-1 min-h-screen bg-violet-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 lg:py-12">
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {initialError}
          </div>
          <Button
            type="button"
            variant="subtle"
            className="text-sm"
            onClick={() => navigate("/host/listings")}
          >
            Back to listings
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 min-h-screen bg-violet-50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 lg:py-12">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isEditMode ? "Edit your activity" : "Let’s set up your activity"}
          </h1>
          <p className="mt-1 text-sm text-gray-600 max-w-xl">
            {isEditMode
              ? "Update the details so families always have the most accurate information."
              : "Fill out the details so families know exactly what you offer."}
          </p>
        </header>

        {submitError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* BASICS */}
          <section className="rounded-2xl bg-white shadow-sm border border-black/5">
            <div className="border-b border-black/5 px-4 sm:px-6 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Basics</h2>
            </div>

            <div className="px-4 sm:px-6 py-4 space-y-4 text-sm">
              {/* Visibility */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Visibility</label>
                <Select value={visibility} onValueChange={(v) => setVisibility(v as Visibility)}>
                  <SelectTrigger className="h-11 text-sm">
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-gray-500">
                  Private is unlisted. Only people with the link can register.
                </p>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your activity a clear name"
                />
              </div>

              {/* Location + virtual toggle */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Location</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Address or general area"
                  />
                  <label className="flex items-center gap-2 text-xs text-gray-700 whitespace-nowrap">
                    <Checkbox
                      checked={isVirtual}
                      onCheckedChange={(checked) => setIsVirtual(Boolean(checked))}
                    />
                    This is a virtual event
                  </label>
                </div>
              </div>

              {/* Price per child */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Price per child</label>

                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 z-10">
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
                    className="pl-8 text-left"
                    inputMode="decimal"
                    autoComplete="off"
                    aria-label="Price per child"
                  />
                </div>
              </div>

              {/* Age range */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">Age range</label>

                <MultiSelect
                  options={AGE_BUCKETS.map((o) => ({ value: o.value, label: o.label }))}
                  value={ageBuckets}
                  onChange={(next: string[]) => {
                    const cleaned = next.filter(isAgeBucket);
                    setAgeBuckets(normalizeAgeBuckets(cleaned));
                  }}
                  placeholder="Select one or more"
                />

                <p className="text-[11px] text-gray-500">
                  Select one or more. This should match the filters families use on the home page.
                </p>
              </div>

              {/* Cancellation */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Cancellation policy</label>
                <Select value={cancellationPolicy} onValueChange={setCancellationPolicy}>
                  <SelectTrigger className="h-11 text-sm">
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
                {selectedCancellationHelper ? (
                  <p className="text-[11px] text-gray-500">{selectedCancellationHelper}</p>
                ) : null}
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Description</label>
                <Textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Share what makes this activity special, what kids will do, and what families should know."
                />
              </div>
            </div>
          </section>

          {/* PHOTOS */}
          <section className="rounded-2xl bg-white shadow-sm border border-black/5">
            <div className="border-b border-black/5 px-4 sm:px-6 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Photos</h2>
            </div>

            <div className="px-4 sm:px-6 py-4">
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
            </div>
          </section>

          {/* SCHEDULING */}
          <section className="rounded-2xl bg-white shadow-sm border border-black/5">
            <div className="border-b border-black/5 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-900">Scheduling</h2>
              <div className="flex items-center gap-2 text-xs">
                <Button
                  type="button"
                  variant={activityType === "fixed" ? "primary" : "subtle"}
                  className="text-xs"
                  onClick={() => setActivityType("fixed")}
                >
                  Fixed class or camp
                </Button>
                <Button
                  type="button"
                  variant={activityType === "ongoing" ? "primary" : "subtle"}
                  className="text-xs"
                  onClick={() => setActivityType("ongoing")}
                >
                  Ongoing
                </Button>
              </div>
            </div>

            {activityType === "fixed" && (
              <div className="px-4 sm:px-6 py-4 space-y-4 text-sm">
                <p className="text-xs text-gray-500">
                  For activities with fixed dates like a summer camp or week-long class.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">Start date</label>
                    <DateInput
                      value={fixedStartDate}
                      onChange={(e) => setFixedStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">End date</label>
                    <DateInput
                      value={fixedEndDate}
                      onChange={(e) => setFixedEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">Start time</label>
                    <TimeSelect
                      value={fixedStartTime}
                      onChange={(v) => setFixedStartTime(v)}
                      placeholder="Select start time"
                      disabled={fixedAllDay}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">End time</label>
                    <TimeSelect
                      value={fixedEndTime}
                      onChange={(v) => setFixedEndTime(v)}
                      placeholder="Select end time"
                      disabled={fixedAllDay}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
                  <label className="inline-flex items-center gap-2">
                    <Checkbox
                      checked={fixedAllDay}
                      onCheckedChange={(checked) => {
                        const isChecked = Boolean(checked);
                        setFixedAllDay(isChecked);
                        if (isChecked) {
                          setFixedStartTime("");
                          setFixedEndTime("");
                        }
                      }}
                    />
                    All day
                  </label>

                  <div className="flex-1 sm:max-w-xs">
                    <Select value={fixedRepeatRule} onValueChange={setFixedRepeatRule}>
                      <SelectTrigger className="h-11 text-sm">
                        <SelectValue placeholder="Repeat" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Does not repeat</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="weekdays">Every weekday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {activityType === "ongoing" && (
              <div className="px-4 sm:px-6 py-4 space-y-4 text-sm">
                <p className="text-xs text-gray-500">
                  For activities that repeat weekly, like ongoing classes or lessons.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">Start date</label>
                    <DateInput
                      value={ongoingStartDate}
                      onChange={(e) => setOngoingStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">End date</label>
                    <DateInput
                      value={ongoingEndDate}
                      onChange={(e) => setOngoingEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-800">Weekly availability</span>
                    <label className="inline-flex items-center gap-2">
                      <Checkbox
                        checked={showAdvancedAvailability}
                        onCheckedChange={(checked) => setShowAdvancedAvailability(Boolean(checked))}
                      />
                      <span>Show advanced availability</span>
                    </label>
                  </div>

                  <div className="space-y-1 text-xs text-gray-600">
                    {(
                      [
                        ["sun", "Sunday"],
                        ["mon", "Monday"],
                        ["tue", "Tuesday"],
                        ["wed", "Wednesday"],
                        ["thu", "Thursday"],
                        ["fri", "Friday"],
                        ["sat", "Saturday"],
                      ] as [DayKey, string][]
                    ).map(([key, label]) => (
                      <div key={key} className="grid grid-cols-[80px,1fr,1fr] gap-2 items-center">
                        <span className="text-gray-700">{label}</span>

                        <TimeSelect
                          value={weeklySchedule[key].start}
                          onChange={(v) => updateDaySchedule(key, "start", v)}
                          placeholder="Start"
                        />

                        <TimeSelect
                          value={weeklySchedule[key].end}
                          onChange={(v) => updateDaySchedule(key, "end", v)}
                          placeholder="End"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ADVANCED CONTROLS */}
          <section className="rounded-2xl bg-white shadow-sm border border-black/5">
            <div className="border-b border-black/5 px-4 sm:px-6 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Advanced controls</h2>
            </div>

            <div className="px-4 sm:px-6 py-4 space-y-6 text-sm">
              <div className="space-y-3">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-800">
                  <Checkbox
                    checked={offerEarlyDropoff}
                    onCheckedChange={(checked) => setOfferEarlyDropoff(Boolean(checked))}
                  />
                  Offer Early Dropoff
                </label>

                {offerEarlyDropoff && (
                  <>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-700">Price</label>
                      <Input
                        value={earlyDropoffPrice}
                        onChange={(e) => setEarlyDropoffPrice(e.target.value)}
                        placeholder="Value"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">Start time</label>
                        <TimeSelect
                          value={earlyDropoffStart}
                          onChange={setEarlyDropoffStart}
                          placeholder="Select start time"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">End time</label>
                        <TimeSelect
                          value={earlyDropoffEnd}
                          onChange={setEarlyDropoffEnd}
                          placeholder="Select end time"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-3 border-t border-black/5 pt-4">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-800">
                  <Checkbox
                    checked={offerExtendedDay}
                    onCheckedChange={(checked) => setOfferExtendedDay(Boolean(checked))}
                  />
                  Offer Extended Day
                </label>

                {offerExtendedDay && (
                  <>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-700">Price</label>
                      <Input
                        value={extendedDayPrice}
                        onChange={(e) => setExtendedDayPrice(e.target.value)}
                        placeholder="Value"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">Start time</label>
                        <TimeSelect
                          value={extendedDayStart}
                          onChange={setExtendedDayStart}
                          placeholder="Select start time"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">End time</label>
                        <TimeSelect
                          value={extendedDayEnd}
                          onChange={setExtendedDayEnd}
                          placeholder="Select end time"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-3 border-t border-black/5 pt-4">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-800">
                  <Checkbox
                    checked={offerSiblingDiscount}
                    onCheckedChange={(checked) => {
                      const isChecked = Boolean(checked);
                      setOfferSiblingDiscount(isChecked);

                      if (!isChecked) {
                        setSiblingDiscountType("none");
                        setSiblingDiscountValue("");
                        return;
                      }

                      if (siblingDiscountType === "none") setSiblingDiscountType("percent");
                    }}
                  />
                  Offer Sibling Discount
                </label>

                {offerSiblingDiscount && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Discount type
                        </label>
                        <Select
                          value={siblingDiscountType === "none" ? "percent" : siblingDiscountType}
                          onValueChange={(v) => setSiblingDiscountType(v as SiblingDiscountType)}
                        >
                          <SelectTrigger className="h-11 text-sm">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">% off each additional sibling</SelectItem>
                            <SelectItem value="amount">$ off each additional sibling</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">Value</label>
                        <div className="relative">
                          {(siblingDiscountType === "amount" || siblingDiscountType === "none") && (
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                              $
                            </span>
                          )}

                          <Input
                            type="number"
                            min={0}
                            max={siblingDiscountType === "percent" ? 100 : undefined}
                            value={siblingDiscountValue}
                            onChange={(e) => setSiblingDiscountValue(e.target.value)}
                            placeholder={siblingDiscountType === "percent" ? "e.g. 10" : "e.g. 25"}
                            className={siblingDiscountType === "percent" ? "" : "pl-6"}
                          />
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-500">Applies to each additional child.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

{/* ACTIONS */}
<div className="flex items-center gap-3 pt-2">
  <Button
    type="button"
    variant="outline"
    size="lg"
    onClick={handleSaveForLater}
    disabled={submitting}
  >
    Save for later
  </Button>

  <Button type="submit" variant="primary" size="lg" disabled={submitting}>
    {submitting
      ? isEditMode
        ? "Saving…"
        : "Creating…"
      : isEditMode
        ? "Save changes"
        : "Create event"}
  </Button>
</div>
        </form>
      </div>
    </main>
  );
};

export default CreateActivityPage;
