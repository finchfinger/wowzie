// src/pages/host/HostApplicationPage.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

import { Container } from "../../components/layout/Container";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Grid } from "../../components/layout/Grid";

import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { AddressInput } from "../../components/ui/AddressInput";
import type { AddressSelection } from "../../components/ui/AddressInput";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "../../components/ui/Select";

import Modal from "../../components/ui/Modal";
import TermsContent from "../../components/legal/TermsContent";

import { CheckboxCard, CheckboxCardsGrid } from "../../components/ui/CheckboxCard";
import { RadioCard, RadioCardsGrid } from "../../components/ui/RadioCard";

const STATES: Array<{ value: string; label: string }> = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

const OPERATING_DURATIONS: Array<{ value: string; label: string }> = [
  { value: "lt_1", label: "Less than 1 year" },
  { value: "1_2", label: "1–2 years" },
  { value: "3_5", label: "3–5 years" },
  { value: "6_10", label: "6–10 years" },
  { value: "11_20", label: "11–20 years" },
  { value: "20_plus", label: "20+ years" },
];

const REFERRAL_SOURCES: Array<{ value: string; label: string }> = [
  { value: "google_search", label: "Google/Search" },
  { value: "social", label: "Social media" },
  { value: "friend_family", label: "Friend or family" },
  { value: "ad", label: "Advertisement" },
  { value: "other", label: "Other" },
];

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

function isAddressSelection(v: unknown): v is AddressSelection {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    "formattedAddress" in o ||
    "placeId" in o ||
    "line1" in o ||
    "city" in o ||
    "state" in o ||
    "postalCode" in o
  );
}

const req = (s: string) => s.trim().length > 0;

function FormSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="border-b border-black/5 px-5 py-4 sm:px-6">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        {subtitle ? <div className="mt-1 text-xs text-gray-600">{subtitle}</div> : null}
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

type AccountType = "individual" | "organization";

const HostApplicationPage: React.FC = () => {
  const navigate = useNavigate();

  const [accountType, setAccountType] = useState<AccountType>("individual");

  // Shared contact
  const [emailAddress, setEmailAddress] = useState("");
  const [phone, setPhone] = useState("");

  // Shared address
  const [formattedAddress, setFormattedAddress] = useState("");
  const [address1, setAddress1] = useState("");
  const [suite, setSuite] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("IL");
  const [postalCode, setPostalCode] = useState("");

  // Individual
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [aboutIndividual, setAboutIndividual] = useState("");

  // Organization
  const [orgName, setOrgName] = useState("");
  const [ein, setEin] = useState("");
  const [primaryContactFirst, setPrimaryContactFirst] = useState("");
  const [primaryContactLast, setPrimaryContactLast] = useState("");
  const [aboutOrg, setAboutOrg] = useState("");
  const [operatingDuration, setOperatingDuration] = useState("");
  const [referralSource, setReferralSource] = useState("");

  // Certifications
  const [certCPR, setCertCPR] = useState(false);
  const [certFirstAid, setCertFirstAid] = useState(false);
  const [certTeaching, setCertTeaching] = useState(false);
  const [certFoodHandling, setCertFoodHandling] = useState(false);

  // Agreements
  const [agreeBackgroundCheck, setAgreeBackgroundCheck] = useState(false);
  const [agreeChildSafety, setAgreeChildSafety] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [termsOpen, setTermsOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stateLabel = useMemo(() => {
    const hit = STATES.find((s) => s.value === state);
    return hit?.label || state;
  }, [state]);

  const validation = useMemo(() => {
    const missing: string[] = [];

    // Shared required
    if (!req(emailAddress)) missing.push("Email address");
    if (!req(phone)) missing.push("Telephone number");

    if (!req(address1)) missing.push("Address");
    if (!req(city)) missing.push("City");
    if (!req(state)) missing.push("State");
    if (!req(postalCode)) missing.push("Postal code");

    // Type-specific required
    if (accountType === "individual") {
      if (!req(firstName)) missing.push("First name");
      if (!req(lastName)) missing.push("Last name");
      if (!req(aboutIndividual)) missing.push("Tell families about yourself");
    } else {
      if (!req(orgName)) missing.push("Organization name");
      if (!req(ein)) missing.push("EIN");
      if (!req(primaryContactFirst)) missing.push("Primary contact first name");
      if (!req(primaryContactLast)) missing.push("Primary contact last name");
      if (!req(aboutOrg)) missing.push("Tell families about your organization");
      if (!req(operatingDuration)) missing.push("Operating duration");
    }

    // Agreements required
    if (!agreeBackgroundCheck) missing.push("Background check");
    if (!agreeChildSafety) missing.push("Child safety policy");
    if (!agreeTerms) missing.push("Terms of service");

    return { ok: missing.length === 0, missing };
  }, [
    accountType,
    emailAddress,
    phone,
    address1,
    city,
    state,
    postalCode,
    firstName,
    lastName,
    aboutIndividual,
    orgName,
    ein,
    primaryContactFirst,
    primaryContactLast,
    aboutOrg,
    operatingDuration,
    agreeBackgroundCheck,
    agreeChildSafety,
    agreeTerms,
  ]);

  const clearForm = () => {
    setAccountType("individual");

    setEmailAddress("");
    setPhone("");

    setFormattedAddress("");
    setAddress1("");
    setSuite("");
    setCity("");
    setState("IL");
    setPostalCode("");

    setFirstName("");
    setLastName("");
    setDateOfBirth("");
    setAboutIndividual("");

    setOrgName("");
    setEin("");
    setPrimaryContactFirst("");
    setPrimaryContactLast("");
    setAboutOrg("");
    setOperatingDuration("");
    setReferralSource("");

    setCertCPR(false);
    setCertFirstAid(false);
    setCertTeaching(false);
    setCertFoodHandling(false);

    setAgreeBackgroundCheck(false);
    setAgreeChildSafety(false);
    setAgreeTerms(false);

    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setError(null);

    if (!validation.ok) {
      setError(`Please complete: ${validation.missing.join(", ")}.`);
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("You need to be signed in to apply.");
        setSubmitting(false);
        return;
      }

      const normalizedPostal = postalCode.replace(/\s+/g, "").slice(0, 10);

      const certs: string[] = [];
      if (certCPR) certs.push("CPR Certified");
      if (certFirstAid) certs.push("First Aid Certified");
      if (certTeaching) certs.push("Teaching License");
      if (certFoodHandling) certs.push("Food Handling Certificate");

      const addrParts: string[] = [];
      addrParts.push(address1.trim());
      if (suite.trim()) addrParts.push(suite.trim());

      const cityStateZip = [city.trim(), state, normalizedPostal].filter(Boolean).join(", ");
      const addrJoined = [addrParts.join(" "), cityStateZip].filter(Boolean).join(" • ");

      const lines: string[] = [];
      lines.push("Host application");
      lines.push("");
      lines.push(`Account type: ${accountType}`);

      if (accountType === "individual") {
        lines.push(`First name: ${firstName.trim()}`);
        lines.push(`Last name: ${lastName.trim()}`);
        if (req(dateOfBirth)) lines.push(`Date of birth: ${dateOfBirth.trim()}`);
      } else {
        lines.push(`Organization name: ${orgName.trim()}`);
        lines.push(`EIN: ${ein.trim()}`);
        lines.push(`Primary contact first name: ${primaryContactFirst.trim()}`);
        lines.push(`Primary contact last name: ${primaryContactLast.trim()}`);
        lines.push(`Operating duration: ${operatingDuration}`);
        if (req(referralSource)) lines.push(`How they heard about us: ${referralSource}`);
      }

      lines.push(`Email: ${emailAddress.trim()}`);
      lines.push(`Telephone: ${phone.trim()}`);
      lines.push(`Address: ${addrJoined}`);

      if (certs.length) {
        lines.push("");
        lines.push(`Certifications: ${certs.join(", ")}`);
      }

      lines.push("");
      if (accountType === "individual") {
        lines.push("Tell families about yourself:");
        lines.push(aboutIndividual.trim());
      } else {
        lines.push("Tell families about your organization:");
        lines.push(aboutOrg.trim());
      }

      const aboutPayload = lines.join("\n");
      const nowIso = new Date().toISOString();

      const { error: upsertErr } = await supabase
        .from("host_profiles")
        .upsert(
          {
            user_id: user.id,
            about: aboutPayload,
            host_status: "pending",
            applied_at: nowIso,
            updated_at: nowIso,
          },
          { onConflict: "user_id" }
        );

      if (upsertErr) {
        console.error("[HostApplicationPage] submit error:", upsertErr);
        setError("We couldn’t submit your application. Please try again.");
        setSubmitting(false);
        return;
      }

      navigate("/host/reviewing", { replace: true });
    } catch (err) {
      console.error("[HostApplicationPage] unexpected submit error:", err);
      setError("We couldn’t submit your application. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    // IMPORTANT: no background here; HostLayout owns the page background (#FAF7F1)
    <main className="flex-1">
      <Container className="py-10 pb-16">
        <Grid cols={12} gap="gap-8">
          <div className="col-span-12 lg:col-span-8 lg:col-start-3">
            <div className="mx-auto w-full max-w-[900px]">
              <SectionHeader
                title="Let’s get to know you"
                subtitle="To make sure every camp is safe, fun, and a good fit, we ask all hosts to tell us a bit about themselves. We’ll review your application and get back to you quickly."
              />

              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <FormSection title="Account type">
                  <RadioCardsGrid>
                    <RadioCard
                      name="host_account_type"
                      id="host-account-individual"
                      title="Individual"
                      description="I’m teaching classes myself"
                      value="individual"
                      selectedValue={accountType}
                      disabled={submitting}
                      onValueChange={(v) => setAccountType(v as AccountType)}
                    />

                    <RadioCard
                      name="host_account_type"
                      id="host-account-organization"
                      title="Organization"
                      description="I represent a business, school, or nonprofit"
                      value="organization"
                      selectedValue={accountType}
                      disabled={submitting}
                      onValueChange={(v) => setAccountType(v as AccountType)}
                    />
                  </RadioCardsGrid>
                </FormSection>

                {accountType === "organization" ? (
                  <FormSection title="Organization information">
                    <div className="space-y-5">
                      <div className="flex items-center justify-between gap-4 rounded-xl border border-black/10 bg-white p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-black/5" />
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              Organization logo
                            </div>
                            <div className="mt-0.5 text-xs text-gray-600">
                              Upload your logo or a photo that represents your organization.
                            </div>
                          </div>
                        </div>
                        <Button type="button" variant="secondary" disabled={submitting}>
                          Upload photo
                        </Button>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Organization name
                        </label>
                        <Input
                          value={orgName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setOrgName(e.target.value)
                          }
                          disabled={submitting}
                          placeholder="The official name of your business, school, or nonprofit"
                          error={!req(orgName) && !!error}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">
                          EIN (Employer Identification Number)
                        </label>
                        <Input
                          value={ein}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEin(e.target.value)
                          }
                          disabled={submitting}
                          placeholder="XX-XXXXXXX"
                          error={!req(ein) && !!error}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-700">
                            Primary Contact First Name
                          </label>
                          <Input
                            value={primaryContactFirst}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setPrimaryContactFirst(e.target.value)
                            }
                            disabled={submitting}
                            placeholder="First name"
                            error={!req(primaryContactFirst) && !!error}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-700">
                            Primary Contact Last Name
                          </label>
                          <Input
                            value={primaryContactLast}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setPrimaryContactLast(e.target.value)
                            }
                            disabled={submitting}
                            placeholder="Last name"
                            error={!req(primaryContactLast) && !!error}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-700">
                            Email address
                          </label>
                          <Input
                            type="email"
                            value={emailAddress}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setEmailAddress(e.target.value)
                            }
                            disabled={submitting}
                            placeholder="you@domain.com"
                            error={!req(emailAddress) && !!error}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-700">
                            Telephone number
                          </label>
                          <Input
                            value={phone}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setPhone(e.target.value)
                            }
                            disabled={submitting}
                            placeholder="(312) 555-0123"
                            error={!req(phone) && !!error}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Address
                        </label>
                        <AddressInput
                          value={formattedAddress}
                          onChange={(next) => {
                            setFormattedAddress(next);
                            setAddress1(next);
                          }}
                          disabled={submitting}
                          placeholder="Your organization’s physical address"
                          error={!req(address1) && !!error}
                          onSelect={(p) => {
                            if (!isAddressSelection(p)) return;

                            const formatted = p.formattedAddress || "";
                            const line1 = p.line1 || formatted;

                            setFormattedAddress(formatted || line1);
                            setAddress1(line1 || "");
                            setCity(p.city || "");
                            setState(p.state || "IL");
                            setPostalCode(p.postalCode || "");
                          }}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Suite (if applicable)
                        </label>
                        <Input
                          value={suite}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setSuite(e.target.value)
                          }
                          disabled={submitting}
                          placeholder="Apt, suite, unit"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-700">
                            City
                          </label>
                          <Input
                            value={city}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setCity(e.target.value)
                            }
                            disabled={submitting}
                            placeholder="City"
                            error={!req(city) && !!error}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-700">
                            State
                          </label>
                          <Select value={state} onValueChange={(v) => setState(v)}>
                            <SelectTrigger
                              className={cx("h-11 w-full")}
                              aria-label="State"
                              error={!req(state) && !!error}
                            >
                              <span className="text-gray-900">{stateLabel}</span>
                            </SelectTrigger>
                            <SelectContent>
                              {STATES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-700">
                            Postal code
                          </label>
                          <Input
                            value={postalCode}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setPostalCode(e.target.value)
                            }
                            disabled={submitting}
                            placeholder="ZIP"
                            error={!req(postalCode) && !!error}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Tell families about your organization
                        </label>
                        <Textarea
                          value={aboutOrg}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setAboutOrg(e.target.value)
                          }
                          disabled={submitting}
                          rows={5}
                          placeholder="What you offer, who it’s for, and what families should expect."
                          error={!req(aboutOrg) && !!error}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-700">
                            How long has your organization been operating?
                          </label>
                          <Select
                            value={operatingDuration}
                            onValueChange={(v) => setOperatingDuration(v)}
                          >
                            <SelectTrigger
                              className={cx("h-11 w-full")}
                              aria-label="Operating duration"
                              error={!req(operatingDuration) && !!error}
                            >
                              <span className="text-gray-900">
                                {OPERATING_DURATIONS.find((d) => d.value === operatingDuration)
                                  ?.label || "Select duration"}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              {OPERATING_DURATIONS.map((d) => (
                                <SelectItem key={d.value} value={d.value}>
                                  {d.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-700">
                            How did you hear about us? (optional)
                          </label>
                          <Select
                            value={referralSource}
                            onValueChange={(v) => setReferralSource(v)}
                          >
                            <SelectTrigger className={cx("h-11 w-full")} aria-label="Referral source">
                              <span className="text-gray-900">
                                {REFERRAL_SOURCES.find((r) => r.value === referralSource)?.label ||
                                  "Select an option"}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              {REFERRAL_SOURCES.map((r) => (
                                <SelectItem key={r.value} value={r.value}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </FormSection>
                ) : (
                  <FormSection title="Personal information">
                    <div className="space-y-5">
                      <div className="flex items-center justify-between gap-4 rounded-xl border border-black/10 bg-white p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-black/5" />
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              Profile photo
                            </div>
                            <div className="mt-0.5 text-xs text-gray-600">
                              Show families the face behind the fun.
                            </div>
                          </div>
                        </div>
                        <Button type="button" variant="secondary" disabled={submitting}>
                          Upload photo
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-700">
                            First name
                          </label>
                          <Input
                            value={firstName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setFirstName(e.target.value)
                            }
                            disabled={submitting}
                            placeholder="First name"
                            error={!req(firstName) && !!error}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-700">
                            Last name
                          </label>
                          <Input
                            value={lastName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setLastName(e.target.value)
                            }
                            disabled={submitting}
                            placeholder="Last name"
                            error={!req(lastName) && !!error}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-700">
                            Email address
                          </label>
                          <Input
                            type="email"
                            value={emailAddress}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setEmailAddress(e.target.value)
                            }
                            disabled={submitting}
                            placeholder="you@domain.com"
                            error={!req(emailAddress) && !!error}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-700">
                            Telephone number
                          </label>
                          <Input
                            value={phone}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setPhone(e.target.value)
                            }
                            disabled={submitting}
                            placeholder="(312) 555-0123"
                            error={!req(phone) && !!error}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Address
                        </label>
                        <AddressInput
                          value={formattedAddress}
                          onChange={(next) => {
                            setFormattedAddress(next);
                            setAddress1(next);
                          }}
                          disabled={submitting}
                          placeholder="Start typing an address"
                          error={!req(address1) && !!error}
                          onSelect={(p) => {
                            if (!isAddressSelection(p)) return;

                            const formatted = p.formattedAddress || "";
                            const line1 = p.line1 || formatted;

                            setFormattedAddress(formatted || line1);
                            setAddress1(line1 || "");
                            setCity(p.city || "");
                            setState(p.state || "IL");
                            setPostalCode(p.postalCode || "");
                          }}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Suite (if applicable)
                        </label>
                        <Input
                          value={suite}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setSuite(e.target.value)
                          }
                          disabled={submitting}
                          placeholder="Apt, suite, unit"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-700">
                            City
                          </label>
                          <Input
                            value={city}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setCity(e.target.value)
                            }
                            disabled={submitting}
                            placeholder="City"
                            error={!req(city) && !!error}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-700">
                            State
                          </label>
                          <Select value={state} onValueChange={(v) => setState(v)}>
                            <SelectTrigger
                              className={cx("h-11 w-full")}
                              aria-label="State"
                              error={!req(state) && !!error}
                            >
                              <span className="text-gray-900">{stateLabel}</span>
                            </SelectTrigger>
                            <SelectContent>
                              {STATES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-700">
                            Postal code
                          </label>
                          <Input
                            value={postalCode}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setPostalCode(e.target.value)
                            }
                            disabled={submitting}
                            placeholder="ZIP"
                            error={!req(postalCode) && !!error}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Date of birth
                        </label>
                        <Input
                          type="date"
                          value={dateOfBirth}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setDateOfBirth(e.target.value)
                          }
                          disabled={submitting}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Tell families about yourself
                        </label>
                        <Textarea
                          value={aboutIndividual}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setAboutIndividual(e.target.value)
                          }
                          disabled={submitting}
                          rows={6}
                          placeholder="Tell us what you host, your experience, and what families should expect."
                          error={!req(aboutIndividual) && !!error}
                        />
                      </div>
                    </div>
                  </FormSection>
                )}

                <FormSection
                  title="Certifications and credentials"
                  subtitle="Not required, but certifications build trust with families and may be needed for certain activity types."
                >
                  <CheckboxCardsGrid>
                    <CheckboxCard
                      id="cert-cpr"
                      title="CPR Certified"
                      checked={certCPR}
                      disabled={submitting}
                      onCheckedChange={setCertCPR}
                    />
                    <CheckboxCard
                      id="cert-first-aid"
                      title="First Aid Certified"
                      checked={certFirstAid}
                      disabled={submitting}
                      onCheckedChange={setCertFirstAid}
                    />
                    <CheckboxCard
                      id="cert-teaching"
                      title="Teaching License"
                      checked={certTeaching}
                      disabled={submitting}
                      onCheckedChange={setCertTeaching}
                    />
                    <CheckboxCard
                      id="cert-food"
                      title="Food Handling Certificate"
                      checked={certFoodHandling}
                      disabled={submitting}
                      onCheckedChange={setCertFoodHandling}
                    />
                  </CheckboxCardsGrid>
                </FormSection>

                <FormSection title="Verification and agreements">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                    <div className="font-semibold">Safety first</div>
                    <div className="mt-1 text-amber-900/80">
                      We run background checks on all staff who work with children. Each person needs
                      to be verified separately. This typically takes 2 to 3 business days.
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <CheckboxCard
                      id="agree-background"
                      title="Background check"
                      description="I consent to a criminal background check. Results are reviewed by our safety team."
                      checked={agreeBackgroundCheck}
                      disabled={submitting}
                      onCheckedChange={setAgreeBackgroundCheck}
                    />

                    <CheckboxCard
                      id="agree-safety"
                      title="Child safety policy"
                      description="I agree to follow our child safety guidelines, including supervision requirements, reporting obligations, and communication policies."
                      checked={agreeChildSafety}
                      disabled={submitting}
                      onCheckedChange={setAgreeChildSafety}
                    />

                    <CheckboxCard
                      id="agree-terms"
                      title="Terms of service"
                      description="I agree to the platform’s terms of service, privacy policy, and host guidelines."
                      checked={agreeTerms}
                      disabled={submitting}
                      onCheckedChange={setAgreeTerms}
                      rightSlot={
                        <button
                          type="button"
                          onClick={() => setTermsOpen(true)}
                          className="text-xs font-medium text-violet-700 underline"
                          disabled={submitting}
                        >
                          View
                        </button>
                      }
                    />
                  </div>

                  {error ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {error}
                    </div>
                  ) : null}
                </FormSection>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={clearForm}
                    disabled={submitting}
                    className={cx(
                      "text-sm font-medium text-gray-600 hover:text-gray-900",
                      submitting && "cursor-not-allowed opacity-60"
                    )}
                  >
                    Clear form
                  </button>

                  <div className="flex items-center gap-2">
                    <Button type="button" variant="secondary" disabled={submitting}>
                      Save for later
                    </Button>

                    <Button type="submit" disabled={submitting || !validation.ok}>
                      {submitting ? "Submitting…" : "Submit for review"}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </Grid>
      </Container>

      <Modal
        isOpen={termsOpen}
        onClose={() => setTermsOpen(false)}
        title="Host Terms & Rules"
        size="lg"
      >
        <div className="max-h-[60vh] space-y-4 overflow-auto pr-1 overscroll-contain">
          <TermsContent />
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setTermsOpen(false)}>
            Close
          </Button>

          <a href="/terms" target="_blank" rel="noreferrer">
            <Button type="button" variant="primary">
              Open full page
            </Button>
          </a>
        </div>
      </Modal>
    </main>
  );
};

export default HostApplicationPage;
