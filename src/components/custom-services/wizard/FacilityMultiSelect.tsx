"use client";

import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { facilities } from "@/data/facilities";

interface FacilityMultiSelectProps {
  /** Currently selected facility IDs */
  value: number[];
  onChange: (next: number[]) => void;
  placeholder?: string;
}

export function FacilityMultiSelect({
  value,
  onChange,
  placeholder,
}: FacilityMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = facilities.filter((f) => value.includes(f.id));

  const toggle = (id: number) => {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="h-auto min-h-9 w-full justify-between py-1.5 sm:w-[320px]"
        >
          <div className="flex flex-1 flex-wrap gap-1">
            {selected.length === 0 ? (
              <span className="text-muted-foreground text-sm">
                {placeholder ?? "Select facilities"}
              </span>
            ) : (
              selected.map((f) => (
                <Badge
                  key={f.id}
                  variant="secondary"
                  className="gap-1 pr-1 text-[11px]"
                >
                  {f.name}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${f.name}`}
                    className="hover:bg-muted-foreground/20 inline-flex size-3.5 items-center justify-center rounded-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(f.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggle(f.id);
                      }
                    }}
                  >
                    <X className="size-2.5" />
                  </span>
                </Badge>
              ))
            )}
          </div>
          <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search facilities..." className="h-9" />
          <CommandList>
            <CommandEmpty>No facilities found.</CommandEmpty>
            <CommandGroup>
              {facilities.map((f) => {
                const checked = value.includes(f.id);
                return (
                  <CommandItem
                    key={f.id}
                    value={f.name}
                    onSelect={() => toggle(f.id)}
                  >
                    <div
                      className={`mr-2 flex size-4 items-center justify-center rounded-sm border ${
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input"
                      }`}
                    >
                      {checked && <Check className="size-3" />}
                    </div>
                    <span className="text-sm">{f.name}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
