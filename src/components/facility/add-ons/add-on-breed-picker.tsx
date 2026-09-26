"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * The breeds of ONE pet type an add-on is for — the reference's "choose
 * particular breeds within each type". None chosen means every breed of the
 * type. A breed is stored as the name the list spells it, the same way the
 * services store theirs.
 */
export function AddOnBreedPicker({
  species,
  breeds,
  selected,
  onChange,
  t,
}: {
  species: string;
  /** Every breed of this type the facility's list holds. */
  breeds: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  t: (key: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const available = breeds.filter((b) => !selected.includes(b));

  return (
    <div className="space-y-2">
      <p className="text-[13.5px] font-semibold">
        {t("breedsOf").replace("{species}", species)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {selected.length === 0 ? (
          <span className="text-muted-foreground text-[13.5px]">
            {t("allBreedsOf").replace("{species}", species)}
          </span>
        ) : (
          selected.map((breed) => (
            <span
              key={breed}
              className="bg-card inline-flex min-h-10 items-center gap-1 rounded-full border border-(--line) pr-1 pl-3 text-[13.5px] max-lg:min-h-12"
            >
              {breed}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8 rounded-full"
                aria-label={t("removeBreed").replace("{name}", breed)}
                onClick={() => onChange(selected.filter((b) => b !== breed))}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </span>
          ))
        )}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <Plus className="size-4" aria-hidden />
              {t("addBreed")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput placeholder={t("searchBreed")} />
              <CommandList className="max-h-64">
                <CommandEmpty>{t("noBreedMatch")}</CommandEmpty>
                <CommandGroup>
                  {available.map((breed) => (
                    <CommandItem
                      key={breed}
                      value={breed}
                      onSelect={() => {
                        onChange([...selected, breed]);
                        setOpen(false);
                      }}
                    >
                      {breed}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
