"use client";

import { useState } from "react";
import { Check, ChevronDown, Globe, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocationContext } from "@/hooks/use-location-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";

export function LocationContextSelector() {
  const { state } = useSidebar();
  const isExpanded = state === "expanded";
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

  const shortLabel = isHQView
    ? "HQ"
    : (currentLocation?.shortCode ?? "??");

  const dotColor = isHQView
    ? "#0ea5e9"
    : (currentLocation?.color ?? "#94a3b8");

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "group flex w-full items-center rounded-xl border transition-all duration-200",
            "border-sidebar-border/60 bg-sidebar-accent/40 hover:bg-sidebar-accent",
            "focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-1",
            isExpanded ? "gap-2.5 px-3 py-2" : "justify-center p-2",
          )}
          aria-label="Switch location"
        >
          {/* Dot / Icon */}
          <div className="relative shrink-0">
            <div
              className="flex size-6 items-center justify-center rounded-md text-[10px] font-bold text-white"
              style={{ backgroundColor: dotColor }}
            >
              {isHQView ? <Globe className="size-3.5" /> : shortLabel.slice(0, 3)}
            </div>
            <span className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full border border-white bg-emerald-500" />
          </div>

          {isExpanded && (
            <>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-xs font-semibold leading-tight">{label}</p>
                <p className="text-muted-foreground text-[10px] leading-tight">
                  {isHQView ? `${locations.length} locations` : currentLocation?.city ?? ""}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "text-muted-foreground size-3.5 shrink-0 transition-transform duration-200",
                  open && "rotate-180",
                )}
              />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-56"
      >
        <DropdownMenuLabel className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
          Location Context
        </DropdownMenuLabel>

        {/* HQ option */}
        <DropdownMenuItem
          onClick={() => { setHQView(); setOpen(false); }}
          className="flex items-center gap-2.5"
        >
          <div className="flex size-6 items-center justify-center rounded-md bg-sky-500 text-white">
            <Globe className="size-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">All Locations (HQ)</p>
            <p className="text-muted-foreground text-[10px]">Cross-location view</p>
          </div>
          {isHQView && <Check className="text-primary size-3.5 shrink-0" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Individual locations */}
        {locations.map((loc) => {
          const isActive = !isHQView && currentLocation?.id === loc.id;
          return (
            <DropdownMenuItem
              key={loc.id}
              onClick={() => { setLocation(loc.id); setOpen(false); }}
              className="flex items-center gap-2.5"
            >
              <div
                className="flex size-6 items-center justify-center rounded-md text-[10px] font-bold text-white"
                style={{ backgroundColor: loc.color }}
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
                    <span className="ml-1 text-red-400">· Inactive</span>
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
