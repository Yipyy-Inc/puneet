"use client";

import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useShellText } from "@/lib/shell/use-shell-text";

type MyFacilities = {
  activeId: string | null;
  facilities: { id: string; name: string; slug: string }[];
};

/**
 * The facility this session is working in, and — for someone who belongs to
 * more than one — the way to change it.
 *
 * Renders its children untouched for a single-facility user, which is almost
 * everybody: no chevron that opens a list of one.
 *
 * Switching reloads the page rather than invalidating queries. Every cached
 * list, every open drawer and every number on screen belongs to the facility
 * being left, and a full load is the one way to be sure none of it survives
 * into the next one.
 */
export function FacilitySwitcher({ children }: { children: ReactNode }) {
  const t = useShellText("header");
  const [switching, setSwitching] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const { data } = useQuery({
    queryKey: ["facility", "switch"],
    queryFn: async (): Promise<MyFacilities> => {
      const res = await fetch("/api/facility/switch");
      if (!res.ok) return { activeId: null, facilities: [] };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const facilities = data?.facilities ?? [];
  if (facilities.length < 2) return <>{children}</>;

  const choose = async (facilityId: string) => {
    if (facilityId === data?.activeId) return;
    setSwitching(facilityId);
    setFailed(false);
    const res = await fetch("/api/facility/switch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ facilityId }),
    });
    if (!res.ok) {
      setSwitching(null);
      setFailed(true);
      return;
    }
    window.location.assign("/facility/dashboard");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("switchFacility")}
          className={cn(
            "flex w-full min-w-0 items-center gap-2 rounded-xl text-left",
            "focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none",
          )}
        >
          <div className="min-w-0 flex-1">{children}</div>
          <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="w-64">
        <DropdownMenuLabel className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          {t("yourFacilities")}
        </DropdownMenuLabel>
        {facilities.map((f) => {
          const active = f.id === data?.activeId;
          return (
            <DropdownMenuItem
              key={f.id}
              disabled={switching !== null}
              onSelect={(event) => {
                event.preventDefault();
                void choose(f.id);
              }}
              className="flex items-center gap-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
              {switching === f.id ? (
                <Loader2 className="size-4 shrink-0 animate-spin" />
              ) : active ? (
                <Check className="text-primary size-4 shrink-0" />
              ) : null}
            </DropdownMenuItem>
          );
        })}
        {failed && (
          <p className="text-destructive px-2 py-1.5 text-xs">
            {t("switchFacilityFailed")}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
