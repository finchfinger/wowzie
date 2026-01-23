// src/components/ui/MultiSelect.tsx
import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "./Command";

export type MultiSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type Props = {
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;

  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;

  // NEW: allow hiding the search input
  showSearch?: boolean;

  disabled?: boolean;
  className?: string;

  maxSelected?: number;
};

export const MultiSelect: React.FC<Props> = ({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results.",
  showSearch = true,
  disabled,
  className,
  maxSelected,
}) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const selected = React.useMemo(() => new Set(value), [value]);

  const byValue = React.useMemo(() => {
    const map = new Map<string, MultiSelectOption>();
    options.forEach((o) => map.set(o.value, o));
    return map;
  }, [options]);

  const selectedOptions = React.useMemo(
    () => value.map((v) => byValue.get(v)).filter(Boolean) as MultiSelectOption[],
    [value, byValue]
  );

  const canAddMore = typeof maxSelected === "number" ? value.length < maxSelected : true;

  const remove = (v: string) => onChange(value.filter((x) => x !== v));

  const toggle = (v: string) => {
    if (selected.has(v)) {
      remove(v);
      return;
    }
    if (!canAddMore) return;
    onChange([...value, v]);
  };

  const focusSearchSoon = () => {
    if (!showSearch) return;
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const onTriggerKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (disabled) return;

    // only use query behavior if search is visible
    const effectiveQuery = showSearch ? query : "";

    if (e.key === "Backspace" && !effectiveQuery && value.length) {
      e.preventDefault();
      onChange(value.slice(0, -1));
      return;
    }

    if (e.key === "Enter" && !open) {
      e.preventDefault();
      setOpen(true);
      focusSearchSoon();
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);

        if (next) focusSearchSoon();
        else setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled ? "true" : "false"}
          onKeyDown={onTriggerKeyDown}
          onClick={() => {
            if (disabled) return;
            setOpen(true);
            focusSearchSoon();
          }}
          className={cn(
            "flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border bg-background px-3 text-sm text-foreground shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
            "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-60",
            "border-input",
            className
          )}
        >
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {selectedOptions.map((opt) => (
              <span
                key={opt.value}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground"
                )}
              >
                {opt.label}
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    remove(opt.value);
                  }}
                  className="rounded-md p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${opt.label}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}

            {selectedOptions.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : null}
          </div>

          <ChevronDown className="h-4 w-4 opacity-70" />
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        className={cn(
          "w-[var(--radix-popover-trigger-width)] p-0",
          "rounded-lg border border-border bg-popover text-popover-foreground shadow-md"
        )}
      >
        <Command>
          {showSearch ? (
            <CommandInput
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder={searchPlaceholder}
            />
          ) : null}

          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>

            {options.map((opt) => {
              const isSelected = selected.has(opt.value);
              const isDisabled =
                Boolean(disabled) ||
                Boolean(opt.disabled) ||
                (!isSelected && !canAddMore);

              return (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    if (isDisabled) return;
                    toggle(opt.value);
                    focusSearchSoon();
                  }}
                  data-disabled={isDisabled ? "true" : "false"}
                  className={cn(
                    "flex items-center justify-between",
                    isDisabled && "opacity-50 pointer-events-none"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex h-4 w-4 items-center justify-center rounded border border-border",
                        isSelected
                          ? "bg-foreground text-background"
                          : "bg-background text-transparent"
                      )}
                      aria-hidden="true"
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    {opt.label}
                  </span>

                  {typeof maxSelected === "number" && !isSelected && !canAddMore ? (
                    <span className="text-[11px] text-muted-foreground">Max</span>
                  ) : null}
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
