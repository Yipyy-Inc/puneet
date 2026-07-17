"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { groomingPackages } from "@/data/grooming";
import type { GroomingWaitlistEntry } from "@/data/grooming-waitlist";
import { useGroomingWaitlist } from "@/hooks/use-grooming-waitlist";
import { cn } from "@/lib/utils";
import type { Client } from "@/types/client";
import type { Pet } from "@/types/pet";

type DateKind = "asap" | "specific-date" | "day-of-week" | "range";
type TimePeriod = "morning" | "afternoon" | "evening" | "anytime";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface GroomingWaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClient?: Client;
  selectedPets: Pet[];
  packageId: string;
  isMobile: boolean;
  postalCode?: string;
}

export function GroomingWaitlistDialog({
  open,
  onOpenChange,
  selectedClient,
  selectedPets,
  packageId,
  isMobile,
  postalCode,
}: GroomingWaitlistDialogProps) {
  const { addEntry } = useGroomingWaitlist();
  const [dateKind, setDateKind] = useState<DateKind>("asap");
  const [specificDate, setSpecificDate] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [excludedDates, setExcludedDates] = useState<string[]>([]);
  const [exclusionDraft, setExclusionDraft] = useState("");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("anytime");
  const [comment, setComment] = useState("");

  const addExclusion = () => {
    if (exclusionDraft && !excludedDates.includes(exclusionDraft)) {
      setExcludedDates((prev) => [...prev, exclusionDraft].sort());
    }
    setExclusionDraft("");
  };

  const pet = selectedPets[0]; // Primary pet on the entry; multi-pet entries
  // would each get their own waitlist row — out of scope for this form.
  const pkg = groomingPackages.find((p) => p.id === packageId);

  const toggleDay = (d: number) =>
    setDaysOfWeek((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );

  const handleSubmit = () => {
    if (!selectedClient || !pet) {
      toast.error("Pick a client and pet first.");
      return;
    }
    if (dateKind === "specific-date" && !specificDate) {
      toast.error("Pick a specific date.");
      return;
    }
    if (dateKind === "day-of-week" && daysOfWeek.length === 0) {
      toast.error("Pick at least one day of the week.");
      return;
    }
    if (dateKind === "range" && (!rangeStart || !rangeEnd)) {
      toast.error("Pick both a start and end date for the range.");
      return;
    }
    if (dateKind === "range" && rangeEnd < rangeStart) {
      toast.error("The range end can't be before the start.");
      return;
    }

    const expectedDate: GroomingWaitlistEntry["expectedDate"] =
      dateKind === "asap"
        ? { kind: "asap" }
        : dateKind === "specific-date"
          ? { kind: "specific-date", date: specificDate }
          : dateKind === "range"
            ? { kind: "range", startDate: rangeStart, endDate: rangeEnd }
            : { kind: "day-of-week", daysOfWeek };

    const expectedTime: GroomingWaitlistEntry["expectedTime"] =
      timePeriod === "anytime"
        ? { kind: "anytime" }
        : {
            kind: "period",
            period: timePeriod,
          };

    // Persist as the first preferred date — the facility-side waitlist tab
    // uses the legacy `date` for sort/index, then enriches from
    // expectedDate/expectedTime for the matcher.
    const legacyDate =
      dateKind === "specific-date"
        ? specificDate
        : dateKind === "range"
          ? rangeStart
          : new Date().toISOString().split("T")[0];

    const entry: GroomingWaitlistEntry = {
      id: `wl-${Date.now()}`,
      date: legacyDate,
      clientId: selectedClient.id,
      petId: pet.id,
      petName: pet.name,
      petBreed: pet.breed,
      ownerName: selectedClient.name ?? "Customer",
      ownerPhone: selectedClient.phone ?? "",
      ownerEmail: selectedClient.email,
      serviceName: pkg?.name ?? "Grooming",
      expectedDate,
      excludedDates: excludedDates.length > 0 ? excludedDates : undefined,
      expectedTime,
      postalCode: isMobile ? postalCode : undefined,
      source: "online-booking",
      comment: comment.trim() || undefined,
      addedAt: new Date().toISOString(),
      status: "waiting",
    };

    // Push through the provider's addEntry so the facility-side Waitlist tab
    // re-renders with the new row.
    addEntry(entry);

    toast.success("Added to the waitlist", {
      description:
        "We&rsquo;ll text or email you when a matching slot opens up.",
    });

    // Reset and close.
    setDateKind("asap");
    setSpecificDate("");
    setDaysOfWeek([]);
    setRangeStart("");
    setRangeEnd("");
    setExcludedDates([]);
    setExclusionDraft("");
    setTimePeriod("anytime");
    setComment("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-pink-100">
              <Sparkles className="size-4 text-pink-600" />
            </div>
            <div>
              <DialogTitle>Join the Waitlist</DialogTitle>
              <DialogDescription className="text-xs">
                We&rsquo;ll reach out when a matching slot opens up.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preferred date */}
          <div>
            <Label className="text-xs font-semibold">Preferred date</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {[
                { kind: "asap" as const, label: "ASAP" },
                { kind: "specific-date" as const, label: "Specific date" },
                { kind: "range" as const, label: "Date range" },
                { kind: "day-of-week" as const, label: "Day of week" },
              ].map((opt) => (
                <button
                  key={opt.kind}
                  type="button"
                  onClick={() => setDateKind(opt.kind)}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-xs font-medium transition",
                    dateKind === opt.kind
                      ? "border-pink-400 bg-pink-50 text-pink-900"
                      : "hover:bg-muted",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {dateKind === "specific-date" && (
              <Input
                type="date"
                className="mt-2 h-9 text-xs"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
              />
            )}
            {dateKind === "range" && (
              <div className="mt-2 flex items-center gap-2">
                <Input
                  type="date"
                  aria-label="Earliest date"
                  className="h-9 text-xs"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                />
                <span className="text-muted-foreground text-xs">to</span>
                <Input
                  type="date"
                  aria-label="Latest date"
                  className="h-9 text-xs"
                  value={rangeEnd}
                  min={rangeStart || undefined}
                  onChange={(e) => setRangeEnd(e.target.value)}
                />
              </div>
            )}
            {dateKind === "day-of-week" && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DAY_LABELS.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={cn(
                      "size-8 rounded-full border text-[11px] font-medium transition",
                      daysOfWeek.includes(i)
                        ? "border-pink-400 bg-pink-100 text-pink-900"
                        : "hover:bg-muted",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Time of day */}
          <div>
            <Label className="text-xs font-semibold">Time of day</Label>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {[
                { v: "morning" as const, label: "Morning" },
                { v: "afternoon" as const, label: "Afternoon" },
                { v: "evening" as const, label: "Evening" },
                { v: "anytime" as const, label: "Anytime" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setTimePeriod(opt.v)}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-[11px] font-medium transition",
                    timePeriod === opt.v
                      ? "border-pink-400 bg-pink-50 text-pink-900"
                      : "hover:bg-muted",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date exclusions */}
          <div>
            <Label className="text-xs font-semibold">
              Dates you can&rsquo;t do (optional)
            </Label>
            <div className="mt-1.5 flex items-center gap-2">
              <Input
                type="date"
                aria-label="Excluded date"
                className="h-9 text-xs"
                value={exclusionDraft}
                onChange={(e) => setExclusionDraft(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                disabled={!exclusionDraft}
                onClick={addExclusion}
              >
                Add
              </Button>
            </div>
            {excludedDates.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {excludedDates.map((d) => (
                  <span
                    key={d}
                    className="bg-muted inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
                  >
                    {d}
                    <button
                      type="button"
                      aria-label={`Remove ${d}`}
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setExcludedDates((prev) => prev.filter((x) => x !== d))
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <Label htmlFor="waitlist-note" className="text-xs font-semibold">
              Note (optional)
            </Label>
            <Textarea
              id="waitlist-note"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mt-1.5 min-h-[64px] text-xs"
              placeholder="Anything we should know — e.g. anxiety, preferred groomer…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="bg-pink-500 hover:bg-pink-600"
          >
            Submit waitlist request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
