"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type EditableField =
  | "about"
  | "instagram"
  | "x"
  | "youtube"
  | "tiktok"
  | "website"
  | null;

export default function HostSettingsPage() {
  const [about, setAbout] = useState("");
  const [instagram, setInstagram] = useState("");
  const [xHandle, setXHandle] = useState<string | null>(null);
  const [youtube, setYoutube] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [website, setWebsite] = useState("");

  // Modal
  const [activeField, setActiveField] = useState<EditableField>(null);
  const [draftValue, setDraftValue] = useState("");

  const openModal = (field: EditableField, currentValue: string | null) => {
    setActiveField(field);
    setDraftValue(currentValue ?? "");
  };

  const closeModal = () => {
    setActiveField(null);
    setDraftValue("");
  };

  const handleSave = () => {
    if (!activeField) return;
    const v = draftValue.trim();
    switch (activeField) {
      case "about": setAbout(v); break;
      case "instagram": setInstagram(v); break;
      case "x": setXHandle(v || null); break;
      case "youtube": setYoutube(v); break;
      case "tiktok": setTiktok(v); break;
      case "website": setWebsite(v); break;
    }
    closeModal();
  };

  const modalTitle: Record<string, string> = {
    about: "Edit about",
    instagram: "Edit Instagram username",
    x: "Edit X (Twitter) handle",
    youtube: "Edit YouTube channel",
    tiktok: "Edit TikTok username",
    website: "Edit website",
  };

  const modalLabel: Record<string, string> = {
    about: "About",
    instagram: "Instagram username",
    x: "X (Twitter) handle",
    youtube: "YouTube channel URL or handle",
    tiktok: "TikTok username",
    website: "Website URL",
  };

  const isTextArea = activeField === "about";

  const links: Array<{
    field: EditableField;
    label: string;
    value: string | null;
    placeholder: string;
  }> = [
    { field: "instagram", label: "Instagram", value: instagram, placeholder: "Username" },
    { field: "x", label: "X", value: xHandle, placeholder: "None provided" },
    { field: "youtube", label: "YouTube", value: youtube, placeholder: "Channel" },
    { field: "tiktok", label: "TikTok", value: tiktok, placeholder: "Username" },
    { field: "website", label: "Website", value: website, placeholder: "www.example.com" },
  ];

  return (
    <div className="space-y-6">
      {/* Basic information */}
      <section className="rounded-2xl">
        <div className="px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Basic information</h2>
        </div>
        <div className="px-5 py-3 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">About</p>
            <p className="text-xs text-foreground max-w-xl line-clamp-2">
              {about || "Tell families about yourself and your programs."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => openModal("about", about)}>
            Edit
          </Button>
        </div>
      </section>

      {/* Links */}
      <section className="rounded-2xl">
        <div className="px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Links</h2>
        </div>
        {links.map((link, idx) => (
          <div
            key={link.field}
            className="px-5 py-3 flex items-center justify-between gap-4"
          >
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-foreground">{link.label}</p>
              <p className="text-[11px] text-muted-foreground">
                {link.value || link.placeholder}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openModal(link.field, link.value)}
            >
              {link.value ? "Edit" : "Add"}
            </Button>
          </div>
        ))}
      </section>

      {/* Edit modal */}
      {activeField && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close"
            onClick={closeModal}
            className="absolute inset-0 bg-black/30"
          />
          <div className="relative mx-auto mt-24 w-[92%] max-w-md rounded-2xl bg-background p-5 shadow-lg">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {modalTitle[activeField] ?? "Edit"}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  This will be shown on your public host profile.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  {modalLabel[activeField] ?? "Value"}
                </label>
                {isTextArea ? (
                  <Textarea
                    rows={4}
                    value={draftValue}
                    onChange={(e) => setDraftValue(e.target.value)}
                  />
                ) : (
                  <Input
                    value={draftValue}
                    onChange={(e) => setDraftValue(e.target.value)}
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={closeModal}>Cancel</Button>
                <Button size="sm" onClick={handleSave}>Save</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
