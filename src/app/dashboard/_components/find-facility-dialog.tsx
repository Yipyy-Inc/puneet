"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { facilityQueries } from "@/lib/api/facility";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

export function FindFacilityDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { data: list = [] } = useQuery({
    ...facilityQueries.list(),
    enabled: open,
  });

  const go = (id: number) => {
    onOpenChange(false);
    router.push(`/dashboard/facilities/${id}`);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Find Facility"
      description="Search facilities by name"
    >
      <CommandInput placeholder="Search facilities by name…" />
      <CommandList>
        <CommandEmpty>No facilities found.</CommandEmpty>
        <CommandGroup heading="Facilities">
          {list.map((f) => (
            <CommandItem
              key={f.id}
              value={f.name}
              onSelect={() => go(f.id)}
              className="flex items-center justify-between gap-2"
            >
              <span className="truncate">{f.name}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                {f.plan && (
                  <span className="text-muted-foreground text-xs">
                    {f.plan}
                  </span>
                )}
                <Badge
                  variant={f.status === "active" ? "success" : "outline"}
                  className="text-[10px] capitalize"
                >
                  {f.status}
                </Badge>
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
