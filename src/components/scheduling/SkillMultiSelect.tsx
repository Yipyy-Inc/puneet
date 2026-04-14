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
import type { Skill } from "@/types/scheduling";

interface Props {
  skills: Skill[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

export function SkillMultiSelect({ skills, value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const selected = skills.filter((s) => value.includes(s.id));

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="h-auto min-h-9 w-full justify-between py-1.5"
        >
          <div className="flex flex-1 flex-wrap gap-1">
            {selected.length === 0 ? (
              <span className="text-muted-foreground text-sm">
                {placeholder ?? "Select required skills"}
              </span>
            ) : (
              selected.map((s) => (
                <Badge
                  key={s.id}
                  variant="secondary"
                  className="gap-1 pr-1 text-[11px]"
                >
                  {s.name}
                  <span
                    role="button"
                    tabIndex={0}
                    className="inline-flex size-3.5 items-center justify-center rounded hover:bg-muted-foreground/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(s.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggle(s.id);
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
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search skills..." className="h-9" />
          <CommandList>
            <CommandEmpty>No skills found.</CommandEmpty>
            <CommandGroup>
              {skills.map((s) => {
                const checked = value.includes(s.id);
                return (
                  <CommandItem
                    key={s.id}
                    value={s.name}
                    onSelect={() => toggle(s.id)}
                  >
                    <div
                      className={`mr-2 flex size-4 items-center justify-center rounded border ${
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input"
                      }`}
                    >
                      {checked && <Check className="size-3" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm">{s.name}</span>
                      {s.description && (
                        <span className="text-muted-foreground text-[11px]">
                          {s.description}
                        </span>
                      )}
                    </div>
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
