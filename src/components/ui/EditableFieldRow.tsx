"use client";

import { Button } from "@/components/ui/button";

type EditableFieldRowProps = {
  label: string;
  value: string;
  placeholder: string;
  onEdit: () => void;
};

export function EditableFieldRow({ label, value, placeholder, onEdit }: EditableFieldRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="space-y-0.5 min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className={`text-[13px] line-clamp-2 ${value ? "text-foreground" : "text-muted-foreground"}`}>
          {value || placeholder}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onEdit} className="shrink-0">
        {value ? "Edit" : "Add"}
      </Button>
    </div>
  );
}
