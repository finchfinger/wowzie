// src/pages/CreateActivityPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { supabase } from "../lib/supabase";

type Visibility = "private" | "public";
type ActivityType = "fixed" | "ongoing";

type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

type DaySchedule = {
  start: string;
  end: string;
};

type SiblingDiscountType = "none" | "percent" | "amount";

type CampMeta = {
  visibility?: Visibility;
  isVirtual?: boolean;
  activityType?: ActivityType;

  cancellation_policy?: string | null;

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
  className?: string;
};

const TimeSelect: React.FC<TimeSelectProps> = ({
  id,
  value,
  onChange,
  placeholder = "Select time",
  disabled,
  className,
}) => {
  return (
    <select
      id={id}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={[
        "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500",
        "disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed",
        className ?? "",
      ].join(" ")}
    >
      <option value="">{placeholder}</option>
      {TIME_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

const CANCELLATION_OPTIONS: Array<{ value: string; label: string; helper: string }> =
  [
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

export const CreateActivityPage: React.FC = () => {
  const navigate = useNavigate();

  // Support both /activities/:id/edit and /host/activities/:activityId/edit
  const params = useParams<{ id?: string; activityId?: string }>();
  const activityId = params.id ?? params.activityId ?? null;
  const isEditMode = Boolean(activityId);

  // Basics
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [isVirtual, setIsVirtual] = useState(false);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(""); // dollars as typed

  // Guest age range + cancellation policy
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [cancellationPolicy, setCancellationPolicy] = useState<string>(
    CANCELLATION_OPTIONS[0]?.value ?? ""
  );

  // Photos
  const [heroImage, setHeroImage] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);

  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

  // Existing image URLs (for edit mode)
  const [existingHeroUrl, setExistingHeroUrl] = useState<string | null>(null);
  const [existingGalleryUrls, setExistingGalleryUrls] = useState<string[]>([]);

  // Scheduling type
  const [activityType, setActivityType] = useState<ActivityType>("fixed");

  // Fixed schedule
  const [fixedStartDate, setFixedStartDate] = useState("");
  const [fixedEndDate, setFixedEndDate] = useState("");
  const [fixedStartTime, setFixedStartTime] = useState(""); // "HH:MM"
  const [fixedEndTime, setFixedEndTime] = useState(""); // "HH:MM"
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

  // Advanced controls (default to FALSE)
  const [offerEarlyDropoff, setOfferEarlyDropoff] = useState(false);
  const [earlyDropoffPrice, setEarlyDropoffPrice] = useState("");
  const [earlyDropoffStart, setEarlyDropoffStart] = useState("");
  const [earlyDropoffEnd, setEarlyDropoffEnd] = useState("");

  const [offerExtendedDay, setOfferExtendedDay] = useState(false);
  const [extendedDayPrice, setExtendedDayPrice] = useState("");
  const [extendedDayStart, setExtendedDayStart] = useState("");
  const [extendedDayEnd, setExtendedDayEnd] = useState("");

  // Sibling discount (checkbox + dropdown + value)
  const [offerSiblingDiscount, setOfferSiblingDiscount] = useState(false);
  const [siblingDiscountType, setSiblingDiscountType] =
    useState<SiblingDiscountType>("none");
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
      setPrice(data.price_cents != null ? (data.price_cents / 100).toString() : "");

      setVisibility(meta.visibility ?? (data.is_published ? "public" : "private"));
      setIsVirtual(Boolean(meta.isVirtual));
      setActivityType(meta.activityType ?? "fixed");

      // Age + cancellation
      setMinAge(meta.min_age != null && !Number.isNaN(meta.min_age) ? String(meta.min_age) : "");
      setMaxAge(meta.max_age != null && !Number.isNaN(meta.max_age) ? String(meta.max_age) : "");
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

      const loadedType: SiblingDiscountType =
        sib.type ??
        (loadedEnabled ? "amount" : "none");

      setOfferSiblingDiscount(loadedEnabled);

      setSiblingDiscountType(loadedEnabled ? loadedType : "none");
      setSiblingDiscountValue((sib.value ?? legacyPrice ?? "") as string);

      // Existing images
      setExistingHeroUrl(data.hero_image_url ?? null);
      setExistingGalleryUrls(((data.image_urls as string[]) || []) as string[]);
      setHeroPreview(data.hero_image_url ?? null);
      setGalleryPreviews((((data.image_urls as string[]) || []) as string[]) || []);

      setInitialLoading(false);
    };

    void loadCamp();

    return () => {
      isMounted = false;
    };
  }, [isEditMode, activityId]);

  // Image handlers
  const handleHeroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setHeroImage(file);
      setHeroPreview(URL.createObjectURL(file));
    } else {
      setHeroImage(null);
      setHeroPreview(existingHeroUrl);
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const limited = files.slice(0, 8);

    setGalleryImages(limited);
    setGalleryPreviews(limited.map((file) => URL.createObjectURL(file)));
  };

  // Helpers
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

  const getExtension = (file: File): string => {
    const parts = file.name.split(".");
    if (parts.length < 2) return "jpg";
    return parts[parts.length - 1].toLowerCase();
  };

  const normalizePriceToCents = (value: string): number | null => {
    const cleaned = value.replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const dollars = parseFloat(cleaned);
    if (Number.isNaN(dollars)) return null;
    return Math.round(dollars * 100);
  };

  const parseIntOrNull = (value: string): number | null => {
    if (!value.trim()) return null;
    const n = Number.parseInt(value.trim(), 10);
    return Number.isNaN(n) ? null : n;
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!title.trim()) {
      setSubmitError("Please add a title for your activity.");
      return;
    }

    const priceCents = normalizePriceToCents(price);
    if (price.trim() && priceCents === null) {
      setSubmitError("Please enter a valid price (for example 450 or 450.00).");
      return;
    }

    const minAgeValue = parseIntOrNull(minAge);
    const maxAgeValue = parseIntOrNull(maxAge);

    setSubmitting(true);

    try {
      // 1) Ensure we have a host / user
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        setSubmitError("You need to be signed in to save an activity.");
        setSubmitting(false);
        return;
      }

      const hostId = userData.user.id;

      // 2) Build meta payload
      const priceCentsMeta = priceCents ?? null;

      // Sibling discount: if checkbox off, force none
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
        min_age: minAgeValue,
        max_age: maxAgeValue,

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
          price_cents: priceCentsMeta,
          display: price || null,
          currency: "USD",
        },
      };

      // 3) Determine slug
      const slug = existingSlug ?? slugify(title);

      // 4) Upload images to storage
      const bucket = "activity-images";
      let heroUrl: string | null = existingHeroUrl;
      let galleryUrls: string[] = [...existingGalleryUrls];
      let anyImageUploadFailed = false;

      // Hero
      if (heroImage) {
        const ext = getExtension(heroImage);
        const heroPath = `${slug}/hero.${ext}`;

        const { error: heroUploadError } = await supabase.storage
          .from(bucket)
          .upload(heroPath, heroImage, {
            cacheControl: "3600",
            upsert: true,
          });

        if (heroUploadError) {
          anyImageUploadFailed = true;
          console.error("Error uploading hero image:", heroUploadError);
        } else {
          const { data: heroPublic } = supabase.storage
            .from(bucket)
            .getPublicUrl(heroPath);
          heroUrl = heroPublic.publicUrl;
        }
      }

      // Gallery (append new images)
      for (let i = 0; i < galleryImages.length; i++) {
        const file = galleryImages[i];
        const ext = getExtension(file);
        const path = `${slug}/gallery-${Date.now()}-${i + 1}.${ext}`;

        const { error: galleryUploadError } = await supabase.storage
          .from(bucket)
          .upload(path, file, {
            cacheControl: "3600",
            upsert: true,
          });

        if (galleryUploadError) {
          anyImageUploadFailed = true;
          console.error(`Error uploading gallery image ${i + 1}:`, galleryUploadError);
          continue;
        }

        const { data: galleryPublic } = supabase.storage
          .from(bucket)
          .getPublicUrl(path);
        galleryUrls.push(galleryPublic.publicUrl);
      }

      if (!galleryUrls.length) galleryUrls = [];

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
        image_url: heroUrl ?? (galleryUrls[0] ?? null),
        meta,
      };

      let savedId = activityId ?? null;

      if (isEditMode && activityId) {
        // UPDATE
        const { data, error } = await supabase
          .from("camps")
          .update(payload)
          .eq("id", activityId)
          .select("id, slug")
          .single();

        if (error || !data) {
          console.error("Error updating camp:", error);
          setSubmitError("We couldn’t save your changes. Please try again.");
          setSubmitting(false);
          return;
        }

        savedId = data.id;
      } else {
        // CREATE
        const { data, error } = await supabase
          .from("camps")
          .insert(payload)
          .select("id, slug")
          .single();

        if (error || !data) {
          console.error("Error inserting camp:", error);
          setSubmitError("We couldn’t save your activity. Please try again.");
          setSubmitting(false);
          return;
        }

        savedId = data.id;
      }

      if (anyImageUploadFailed) {
        console.warn(
          "One or more images failed to upload. Activity was saved without some images."
        );
      }

      // Navigate after save
      if (savedId) navigate(`/host/activities/${savedId}`);
      else navigate("/host/listings");
    } catch (err) {
      console.error("Unexpected error saving activity:", err);
      setSubmitError("Something went wrong while saving your activity.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveForLater = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/host");
  };

  // Render
  if (initialLoading) {
    return (
      <main className="flex-1 bg-violet-50">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-10 lg:py-12 text-xs text-gray-500">
          Loading activity…
        </div>
      </main>
    );
  }

  if (initialError) {
    return (
      <main className="flex-1 bg-violet-50">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-10 lg:py-12">
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
    <main className="flex-1 bg-violet-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-10 lg:py-12">
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

        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl" noValidate>
          {/* BASICS */}
          <section className="rounded-2xl bg-white shadow-sm border border-black/5">
            <div className="border-b border-black/5 px-4 sm:px-6 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Basics</h2>
            </div>

            <div className="px-4 sm:px-6 py-4 space-y-4 text-sm">
              {/* Visibility */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">
                  Visibility
                </label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as Visibility)}
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
                <p className="text-[11px] text-gray-500">
                  Unlisted. Only people with link can register.
                </p>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your activity a clear name"
                />
              </div>

              {/* Location + virtual toggle */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">
                  Location
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Address or general area"
                  />
                  <label className="flex items-center gap-2 text-xs text-gray-700 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-violet-600"
                      checked={isVirtual}
                      onChange={(e) => setIsVirtual(e.target.checked)}
                    />
                    This is a virtual event
                  </label>
                </div>
              </div>

              {/* Price */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">
                  Price per child
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                    $
                  </span>
                  <input
                    type="text"
                    className="block w-full rounded-md border border-gray-300 pl-6 pr-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 450"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  Total price for this camp or series in USD.
                </p>
              </div>

              {/* Age range */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">
                  Age range
                </label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="number"
                      min={0}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      value={minAge}
                      onChange={(e) => setMinAge(e.target.value)}
                      placeholder="Min age (e.g. 6)"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      min={0}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      value={maxAge}
                      onChange={(e) => setMaxAge(e.target.value)}
                      placeholder="Max age (e.g. 11)"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">
                  Families will see this on the listing and in “Guest requirements.”
                </p>
              </div>

              {/* Cancellation policy */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">
                  Cancellation policy
                </label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={cancellationPolicy}
                  onChange={(e) => setCancellationPolicy(e.target.value)}
                >
                  {CANCELLATION_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {selectedCancellationHelper ? (
                  <p className="text-[11px] text-gray-500">{selectedCancellationHelper}</p>
                ) : null}
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  rows={4}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Share what makes this activity special, what kids will do, and what families should know."
                />
              </div>

              {/* PHOTOS */}
              <div className="space-y-3 border-t border-black/5 pt-4">
                <p className="text-xs font-medium text-gray-700">Photos</p>
                <p className="text-[11px] text-gray-500 max-w-md">
                  Add a cover photo and a few gallery images. We’ll automatically rename
                  and organize them for this activity when you publish.
                </p>

                {/* Hero / cover photo */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px,1fr] items-start">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-700">
                      Cover photo
                    </label>
                    <div className="aspect-[4/3] w-full rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-[11px] text-gray-500 overflow-hidden">
                      {heroPreview || existingHeroUrl ? (
                        <img
                          src={heroPreview || existingHeroUrl || ""}
                          alt="Cover preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>Upload a clear, inviting photo</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p className="text-gray-600">
                      This will be the main image families see on your listing. Use a
                      bright, welcoming shot that shows the space or kids in action.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleHeroChange}
                      className="block w-full text-xs text-gray-700"
                    />
                  </div>
                </div>

                {/* Gallery images */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-700">
                    Gallery (optional)
                  </label>
                  <p className="text-[11px] text-gray-500">
                    Add a few more photos to show different activities, spaces, or details.
                    Up to 8 images.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryChange}
                    className="block w-full text-xs text-gray-700"
                  />

                  {(galleryPreviews.length > 0 || existingGalleryUrls.length > 0) && (
                    <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {(galleryPreviews.length ? galleryPreviews : existingGalleryUrls).map(
                        (src, index) => (
                          <div
                            key={index}
                            className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-50"
                          >
                            <img
                              src={src}
                              alt={`Gallery preview ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* SCHEDULING */}
          <section className="rounded-2xl bg-white shadow-sm border border-black/5">
            <div className="border-b border-black/5 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-900">Scheduling</h2>
              <div className="flex items-center gap-2 text-xs">
                <label className="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    className="h-3.5 w-3.5 text-violet-600 border-gray-300"
                    value="fixed"
                    checked={activityType === "fixed"}
                    onChange={() => setActivityType("fixed")}
                  />
                  <span>Fixed class or camp</span>
                </label>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    className="h-3.5 w-3.5 text-violet-600 border-gray-300"
                    value="ongoing"
                    checked={activityType === "ongoing"}
                    onChange={() => setActivityType("ongoing")}
                  />
                  <span>Ongoing with bookable slots</span>
                </label>
              </div>
            </div>

            {activityType === "fixed" && (
              <div className="px-4 sm:px-6 py-4 space-y-4 text-sm">
                <p className="text-xs text-gray-500">
                  For activities with fixed dates like a summer camp or week-long class.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">
                      Start date
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      value={fixedStartDate}
                      onChange={(e) => setFixedStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">
                      End date
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      value={fixedEndDate}
                      onChange={(e) => setFixedEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">
                      Start time
                    </label>
                    <TimeSelect
                      value={fixedStartTime}
                      onChange={(v) => setFixedStartTime(v)}
                      placeholder="Select start time"
                      disabled={fixedAllDay}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">
                      End time
                    </label>
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
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-violet-600"
                      checked={fixedAllDay}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFixedAllDay(checked);
                        if (checked) {
                          setFixedStartTime("");
                          setFixedEndTime("");
                        }
                      }}
                    />
                    All day
                  </label>

                  <div className="flex-1 sm:max-w-xs">
                    <select
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      value={fixedRepeatRule}
                      onChange={(e) => setFixedRepeatRule(e.target.value)}
                    >
                      <option value="none">Does not repeat</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="weekdays">Every weekday</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activityType === "ongoing" && (
              <div className="px-4 sm:px-6 py-4 space-y-4 text-sm">
                <p className="text-xs text-gray-500">
                  For activities that repeat weekly or monthly, like ongoing classes or lessons.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">
                      Start date
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      value={ongoingStartDate}
                      onChange={(e) => setOngoingStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">
                      End date
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      value={ongoingEndDate}
                      onChange={(e) => setOngoingEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-800">Weekly availability</span>
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600"
                        checked={showAdvancedAvailability}
                        onChange={(e) => setShowAdvancedAvailability(e.target.checked)}
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
              {/* Early dropoff */}
              <div className="space-y-3">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-violet-600"
                    checked={offerEarlyDropoff}
                    onChange={(e) => setOfferEarlyDropoff(e.target.checked)}
                  />
                  Offer Early Dropoff
                </label>

                {offerEarlyDropoff && (
                  <>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-700">
                        Price
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        placeholder="Value"
                        value={earlyDropoffPrice}
                        onChange={(e) => setEarlyDropoffPrice(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Start time
                        </label>
                        <TimeSelect
                          value={earlyDropoffStart}
                          onChange={setEarlyDropoffStart}
                          placeholder="Select start time"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">
                          End time
                        </label>
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

              {/* Extended day */}
              <div className="space-y-3 border-t border-black/5 pt-4">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-violet-600"
                    checked={offerExtendedDay}
                    onChange={(e) => setOfferExtendedDay(e.target.checked)}
                  />
                  Offer Extended Day
                </label>

                {offerExtendedDay && (
                  <>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-700">
                        Price
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        placeholder="Value"
                        value={extendedDayPrice}
                        onChange={(e) => setExtendedDayPrice(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Start time
                        </label>
                        <TimeSelect
                          value={extendedDayStart}
                          onChange={setExtendedDayStart}
                          placeholder="Select start time"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">
                          End time
                        </label>
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

              {/* Sibling discount */}
              <div className="space-y-3 border-t border-black/5 pt-4">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-violet-600"
                    checked={offerSiblingDiscount}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setOfferSiblingDiscount(checked);

                      if (!checked) {
                        setSiblingDiscountType("none");
                        setSiblingDiscountValue("");
                        return;
                      }

                      // if turning on and type was none, default to percent to avoid "enabled + none"
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
                        <select
                          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm
                                     focus:outline-none focus:ring-2 focus:ring-violet-500"
                          value={siblingDiscountType === "none" ? "percent" : siblingDiscountType}
                          onChange={(e) =>
                            setSiblingDiscountType(e.target.value as SiblingDiscountType)
                          }
                        >
                          <option value="percent">% off each additional sibling</option>
                          <option value="amount">$ off each additional sibling</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Value
                        </label>
                        <div className="relative">
                          {(siblingDiscountType === "amount" ||
                            siblingDiscountType === "none") && (
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                              $
                            </span>
                          )}

                          <input
                            type="number"
                            min={0}
                            max={siblingDiscountType === "percent" ? 100 : undefined}
                            className={[
                              "w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm",
                              "focus:outline-none focus:ring-2 focus:ring-violet-500",
                              siblingDiscountType === "percent" ? "" : "pl-6",
                            ].join(" ")}
                            placeholder={siblingDiscountType === "percent" ? "e.g. 10" : "e.g. 25"}
                            value={siblingDiscountValue}
                            onChange={(e) => setSiblingDiscountValue(e.target.value)}
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
              variant="subtle"
              className="text-sm"
              onClick={handleSaveForLater}
              disabled={submitting}
            >
              Save for later
            </Button>
            <Button
              type="submit"
              className="text-sm bg-gray-900 text-white"
              disabled={submitting}
            >
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
