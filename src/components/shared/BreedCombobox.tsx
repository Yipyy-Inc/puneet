"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [open, setOpen] = useState(false);

  const popular = getPopularBreeds(species);
  const all = getBreedsBySpecies(species).filter((b) => !b.popular);

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-9 w-full justify-between text-sm font-normal",
              !value && "text-muted-foreground",
              error && "border-destructive",
            )}
          >
            {value || "Select breed..."}
            <ChevronsUpDown className="text-muted-foreground ml-2 size-3.5 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search breed..." />
            <CommandList>
              <CommandEmpty>
                No breed found. Select &quot;Other&quot; below.
              </CommandEmpty>
              {popular.length > 0 && (
                <CommandGroup heading="Popular">
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
              <CommandGroup heading="All Breeds">
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
                  value="Other (type manually)"
                  onSelect={() => {
                    onChange("Other");
                    setOpen(false);
                  }}
                >
                  <Search className="mr-2 size-3.5" />
                  Other (type manually)
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-destructive mt-1 text-sm">{error}</p>}
    </div>
  );
}
