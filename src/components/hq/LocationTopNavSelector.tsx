"use client";

import { useState } from "react";

import { Check, ChevronDown, Globe, MapPin } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocationContext } from "@/hooks/use-location-context";
import { locationStyles } from "@/lib/hq/location-styles";
import { cn } from "@/lib/utils";

// Top-nav location selector for the facility header. Mirrors the sidebar
// LocationContextSelector but is styled as a header pill and does not depend on
// the sidebar context, so it can live in the top bar. Drives the same
// LocationContext that filters all facility data.
export function LocationTopNavSelector() {
  const {
    currentLocation,
    isHQView,
    locations,
    isMultiLocation,
    setLocation,
    setHQView,
  } = useLocationContext();
  const [open, setOpen] = useState(false);

  if (!isMultiLocation) return null;

  const label = isHQView
    ? "All Locations"
    : (currentLocation?.name ?? "Select Location");
  const dotBg = isHQView
    ? "bg-sky-500"
    : currentLocation
      ? locationStyles(currentLocation).bg
      : "bg-slate-400";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Switch location"
          className="group hover:bg-muted flex h-9 items-center gap-2 rounded-xl border px-2.5 transition-colors"
        >
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-md text-[9px] font-bold text-white",
              dotBg,
            )}
          >
            {isHQView ? (
              <Globe className="size-3" />
            ) : (
              (currentLocation?.shortCode.slice(0, 3) ?? "??")
            )}
          </span>
          <span className="hidden max-w-[140px] truncate text-xs font-medium sm:block">
            {label}
          </span>
          <ChevronDown
            className={cn(
              "text-muted-foreground size-3.5 shrink-0 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={6} className="w-60">
        <DropdownMenuLabel className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
          Location Context
        </DropdownMenuLabel>

        <DropdownMenuItem
          onClick={() => {
            setHQView();
            setOpen(false);
          }}
          className="flex items-center gap-2.5"
        >
          <div className="flex size-6 items-center justify-center rounded-md bg-sky-500 text-white">
            <Globe className="size-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">All Locations (HQ)</p>
            <p className="text-muted-foreground text-[10px]">
              Cross-location view
            </p>
          </div>
          {isHQView && <Check className="text-primary size-3.5 shrink-0" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {locations.map((loc) => {
          const isActive = !isHQView && currentLocation?.id === loc.id;
          const s = locationStyles(loc);
          return (
            <DropdownMenuItem
              key={loc.id}
              onClick={() => {
                setLocation(loc.id);
                setOpen(false);
              }}
              className="flex items-center gap-2.5"
            >
              <div
                className={cn(
                  "flex size-6 items-center justify-center rounded-md text-[10px] font-bold text-white",
                  s.bg,
                )}
              >
                {loc.shortCode.slice(0, 3)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-medium">{loc.name}</p>
                  {loc.isPrimary && (
                    <span className="rounded-sm bg-sky-50 px-1 py-px text-[9px] font-semibold text-sky-600 dark:bg-sky-950 dark:text-sky-400">
                      Main
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground flex items-center gap-1 text-[10px]">
                  <MapPin className="size-2.5" />
                  {loc.city}
                  {!loc.isActive && (
                    <span className="ml-1 text-rose-400">· Inactive</span>
                  )}
                </p>
              </div>
              {isActive && <Check className="text-primary size-3.5 shrink-0" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
