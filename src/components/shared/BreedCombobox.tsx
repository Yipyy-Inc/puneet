"use client";

import { useShellText } from "@/lib/shell/use-shell-text";
import { useState } from "react";
import { Check, ChevronsUpDown, Pencil, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getBreedsBySpecies, getPopularBreeds } from "@/data/breeds";

interface BreedComboboxProps {
  species: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function BreedCombobox({
  species,
  value,
  onChange,
  error,
}: BreedComboboxProps) {
  const t = useShellText("primitives");
  const [open, setOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const popular = getPopularBreeds(species);
  const all = getBreedsBySpecies(species).filter((b) => !b.popular);

  const handleListWheel: React.WheelEventHandler<HTMLElement> = (event) => {
    const list = event.currentTarget;
    const canScroll = list.scrollHeight > list.clientHeight;
    if (!canScroll) return;

    const delta = event.deltaY;
    const nextScrollTop = list.scrollTop + delta;
    const atTop = list.scrollTop <= 0;
    const atBottom =
      list.scrollTop + list.clientHeight >= list.scrollHeight - 1;

    if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
      return;
    }

    // In dialog + popover stacks, default wheel behavior can be intercepted.
    // Apply list scrolling directly so users can use mouse wheel/trackpad naturally.
    event.preventDefault();
    list.scrollTop = nextScrollTop;
  };

  // If already in manual mode, show a text input + switch-back button
  if (manualMode) {
    return (
      <div>
        <div className="flex gap-1.5">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder='Type breed, e.g. "Golden Retriever / Poodle Mix"'
            className={cn("h-9 flex-1 text-sm", error && "border-destructive")}
            autoFocus
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 shrink-0"
            onClick={() => setManualMode(false)}
            title={t("switchToBreedList")}
          >
            <List className="size-3.5" />
          </Button>
        </div>
        {error && <p className="text-destructive mt-1 text-sm">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-1.5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "h-9 flex-1 justify-between text-sm font-normal",
                !value && "text-muted-foreground",
                error && "border-destructive",
              )}
            >
              {value || t("selectBreed")}
              <ChevronsUpDown className="text-muted-foreground ml-2 size-3.5 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder={t("searchBreed")} />
              <CommandList onWheelCapture={handleListWheel}>
                <CommandEmpty>{t("noBreedFound")}</CommandEmpty>
                {popular.length > 0 && (
                  <CommandGroup heading={t("popularBreeds")}>
                    {popular.map((b) => (
                      <CommandItem
                        key={b.name}
                        value={b.name}
                        onSelect={() => {
                          onChange(b.name);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 size-3.5",
                            value === b.name ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {b.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                <CommandSeparator />
                <CommandGroup heading={t("allBreeds")}>
                  {all.map((b) => (
                    <CommandItem
                      key={b.name}
                      value={b.name}
                      onSelect={() => {
                        onChange(b.name);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 size-3.5",
                          value === b.name ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {b.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="__type_manually__"
                    onSelect={() => {
                      setOpen(false);
                      setManualMode(true);
                    }}
                  >
                    <Pencil className="mr-2 size-3.5" />
                    {t("typeManuallyMixed")}
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          onClick={() => setManualMode(true)}
          title={t("typeBreedManually")}
        >
          <Pencil className="size-3.5" />
        </Button>
      </div>
      {error && <p className="text-destructive mt-1 text-sm">{error}</p>}
    </div>
  );
}
