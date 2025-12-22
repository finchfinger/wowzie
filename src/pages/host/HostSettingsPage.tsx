// src/pages/host/HostSettingsPage.tsx
import React, { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";

type EditableField =
  | "about"
  | "instagram"
  | "x"
  | "youtube"
  | "tiktok"
  | "website"
  | null;

export const HostSettingsPage: React.FC = () => {
  // Fake initial data for now – eventually this should come from Supabase
  const [about, setAbout] = useState(
    "Sara is a former teacher and mom of two who’s been leading hands-on, curiosity-driven camps for the past several summers."
  );
  const [instagram, setInstagram] = useState("username");
  const [xHandle, setXHandle] = useState<string | null>(null);
  const [youtube, setYoutube] = useState("channelname");
  const [tiktok, setTiktok] = useState("username");
  const [website, setWebsite] = useState("www.specialsite.com");

  // Modal state
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

    switch (activeField) {
      case "about":
        setAbout(draftValue.trim());
        break;
      case "instagram":
        setInstagram(draftValue.trim());
        break;
      case "x":
        setXHandle(draftValue.trim() || null);
        break;
      case "youtube":
        setYoutube(draftValue.trim());
        break;
      case "tiktok":
        setTiktok(draftValue.trim());
        break;
      case "website":
        setWebsite(draftValue.trim());
        break;
    }

    // later: call Supabase to persist
    closeModal();
  };

  const modalTitle = (() => {
    switch (activeField) {
      case "about":
        return "Edit about";
      case "instagram":
        return "Edit Instagram username";
      case "x":
        return "Edit X (Twitter) handle";
      case "youtube":
        return "Edit YouTube channel";
      case "tiktok":
        return "Edit TikTok username";
      case "website":
        return "Edit website";
      default:
        return "";
    }
  })();

  const modalLabel = (() => {
    switch (activeField) {
      case "about":
        return "About";
      case "instagram":
        return "Instagram username";
      case "x":
        return "X (Twitter) handle";
      case "youtube":
        return "YouTube channel URL or handle";
      case "tiktok":
        return "TikTok username";
      case "website":
        return "Website URL";
      default:
        return "";
    }
  })();

  const isTextArea = activeField === "about";

  return (
    <div className="space-y-6">
      {/* Basic information */}
      <section className="rounded-3xl bg-white border border-black/5 shadow-sm">
        <div className="border-b border-black/5 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Basic information
          </h2>
        </div>

        <div className="px-5 py-3 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-700">About</p>
            <p className="text-xs text-gray-600 max-w-xl line-clamp-2">
              {about}
            </p>
          </div>
          <Button
            variant="secondary"
            size="xs"
            onClick={() => openModal("about", about)}
          >
            Edit
          </Button>
        </div>
      </section>

      {/* Links */}
      <section className="rounded-3xl bg-white border border-black/5 shadow-sm">
        <div className="border-b border-black/5 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Links</h2>
        </div>

        {/* Instagram */}
        <div className="px-5 py-3 flex items-center justify-between gap-4 border-b border-black/5 last:border-b-0">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-gray-800">Instagram</p>
            <p className="text-[11px] text-gray-500">
              {instagram || "Username"}
            </p>
          </div>
          <Button
            variant="secondary"
            size="xs"
            onClick={() => openModal("instagram", instagram)}
          >
            Edit
          </Button>
        </div>

        {/* X */}
        <div className="px-5 py-3 flex items-center justify-between gap-4 border-b border-black/5">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-gray-800">X</p>
            <p className="text-[11px] text-gray-500">
              {xHandle || "None provided"}
            </p>
          </div>
          <Button
            variant="secondary"
            size="xs"
            onClick={() => openModal("x", xHandle)}
          >
            {xHandle ? "Edit" : "Add"}
          </Button>
        </div>

        {/* YouTube */}
        <div className="px-5 py-3 flex items-center justify-between gap-4 border-b border-black/5">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-gray-800">YouTube</p>
            <p className="text-[11px] text-gray-500">
              {youtube || "Channel"}
            </p>
          </div>
          <Button
            variant="secondary"
            size="xs"
            onClick={() => openModal("youtube", youtube)}
          >
            Edit
          </Button>
        </div>

        {/* TikTok */}
        <div className="px-5 py-3 flex items-center justify-between gap-4 border-b border-black/5">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-gray-800">Tiktok</p>
            <p className="text-[11px] text-gray-500">
              {tiktok || "Username"}
            </p>
          </div>
          <Button
            variant="secondary"
            size="xs"
            onClick={() => openModal("tiktok", tiktok)}
          >
            Edit
          </Button>
        </div>

        {/* Website */}
        <div className="px-5 py-3 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-gray-800">Website</p>
            <p className="text-[11px] text-gray-500">{website}</p>
          </div>
          <Button
            variant="secondary"
            size="xs"
            onClick={() => openModal("website", website)}
          >
            Edit
          </Button>
        </div>
      </section>

      {/* Modal */}
      <Modal isOpen={!!activeField} onClose={closeModal} size="sm">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {modalTitle}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              This will be shown on your public host profile.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">
              {modalLabel}
            </label>
            {isTextArea ? (
              <textarea
                className="mt-1 block w-full rounded-xl border border-black/10 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                rows={4}
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
              />
            ) : (
              <input
                type="text"
                className="mt-1 block w-full rounded-xl border border-black/10 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
              />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={closeModal}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={handleSave}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default HostSettingsPage;
