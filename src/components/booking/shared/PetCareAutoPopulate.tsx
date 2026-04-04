"use client";

import { useState } from "react";
import { careInstructions } from "@/data/pet-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, ChevronDown, ChevronUp } from "lucide-react";
import type { FeedingScheduleItem, MedicationItem } from "@/types/booking";
import type { CareInstructions } from "@/types/pet";

function makeId() {
  return `auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function parseFeedingFromProfile(
  care: CareInstructions,
  petId: number,
): FeedingScheduleItem | null {
  if (!care.feedingSchedule && !care.feedingAmount) return null;

  // Parse times like "8:00 AM, 12:00 PM, 6:00 PM" or "07:00, 12:00"
  const timeStr = care.feedingSchedule ?? "";
  const times = timeStr
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const labels = ["Breakfast", "Lunch", "Dinner", "Snack"];
  const occasions = times.map((raw, i) => {
    // Try to normalize to HH:MM
    let time = raw;
    const match = raw.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const mins = match[2];
      if (match[3]?.toUpperCase() === "PM" && hours < 12) hours += 12;
      if (match[3]?.toUpperCase() === "AM" && hours === 12) hours = 0;
      time = `${String(hours).padStart(2, "0")}:${mins}`;
    }
    return {
      id: makeId(),
      label: labels[i] ?? `Meal ${i + 1}`,
      time,
      components: [
        {
          id: makeId(),
          type: "kibble" as const,
          name: "",
          amount: care.feedingAmount?.replace(/[^0-9./]/g, "") || "1",
          unit: "cups" as const,
        },
      ],
    };
  });

  if (occasions.length === 0) return null;

  return {
    id: makeId(),
    petId,
    occasions,
    source: "parent_brings",
    prepInstructions: [],
    ifRefuses: [],
    frequency: "daily",
    allergies: [],
    notes: care.feedingAmount
      ? `Amount from profile: ${care.feedingAmount}`
      : "",
  };
}

function parseMedsFromProfile(
  care: CareInstructions,
  petId: number,
): MedicationItem[] {
  if (!care.medicationList?.length) return [];

  return care.medicationList.map((med) => ({
    id: makeId(),
    petId,
    name: med.name,
    purpose: "",
    amount: med.dosage,
    form: "pill" as const,
    frequency: med.frequency.toLowerCase().includes("twice")
      ? ("twice_daily" as const)
      : med.frequency.toLowerCase().includes("daily")
        ? ("once_daily" as const)
        : ("once_daily" as const),
    times: ["08:00"],
    adminInstructions: [],
    ifMissed: "skip_continue" as const,
    notes: med.notes ?? "",
  }));
}

// ── Feeding auto-populate ────────────────────────────────────────────

interface FeedingAutoPopulateProps {
  selectedPets: Array<{ id: number; name: string }>;
  feedingSchedule: FeedingScheduleItem[];
  setFeedingSchedule: (schedule: FeedingScheduleItem[]) => void;
}

export function FeedingAutoPopulate({
  selectedPets,
  feedingSchedule,
  setFeedingSchedule,
}: FeedingAutoPopulateProps) {
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const petsWithCare = selectedPets
    .map((pet) => {
      const care = careInstructions.find((c) => c.petId === pet.id);
      if (!care?.feedingSchedule && !care?.feedingAmount) return null;
      return { pet, care };
    })
    .filter(Boolean) as Array<{
    pet: { id: number; name: string };
    care: CareInstructions;
  }>;

  if (petsWithCare.length === 0) return null;

  const handleLoad = () => {
    const newItems: FeedingScheduleItem[] = [];
    for (const { pet, care } of petsWithCare) {
      // Don't duplicate if already loaded for this pet
      if (feedingSchedule.some((f) => f.petId === pet.id)) continue;
      const item = parseFeedingFromProfile(care, pet.id);
      if (item) newItems.push(item);
    }
    if (newItems.length > 0) {
      setFeedingSchedule([...feedingSchedule, ...newItems]);
    }
    setLoaded(true);
  };

  if (loaded) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5">
        <Check className="size-4 text-emerald-600" />
        <p className="text-xs font-medium text-emerald-700">
          Feeding instructions loaded from{" "}
          {petsWithCare.map((p) => p.pet.name).join(", ")}&apos;s profile
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-blue-200 bg-blue-50">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-blue-600" />
          <div>
            <p className="text-xs font-semibold text-blue-800">
              Saved feeding instructions found
            </p>
            <p className="text-[11px] text-blue-600">
              {petsWithCare.map((p) => p.pet.name).join(", ")}{" "}
              {petsWithCare.length === 1 ? "has" : "have"} feeding info on file
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-blue-700 hover:bg-blue-100"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </Button>
          <Button
            size="sm"
            className="h-7 bg-blue-600 text-xs hover:bg-blue-700"
            onClick={handleLoad}
          >
            Load from profile
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-blue-200 bg-white/50 px-4 py-2.5">
          {petsWithCare.map(({ pet, care }) => (
            <div key={pet.id} className="space-y-1">
              <p className="text-xs font-semibold text-blue-900">{pet.name}</p>
              {care.feedingSchedule && (
                <p className="text-[11px] text-blue-700">
                  Schedule: {care.feedingSchedule}
                </p>
              )}
              {care.feedingAmount && (
                <p className="text-[11px] text-blue-700">
                  Amount: {care.feedingAmount}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Medication auto-populate ─────────────────────────────────────────

interface MedicationAutoPopulateProps {
  selectedPets: Array<{ id: number; name: string }>;
  medications: MedicationItem[];
  setMedications: (medications: MedicationItem[]) => void;
}

export function MedicationAutoPopulate({
  selectedPets,
  medications,
  setMedications,
}: MedicationAutoPopulateProps) {
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const petsWithMeds = selectedPets
    .map((pet) => {
      const care = careInstructions.find((c) => c.petId === pet.id);
      if (!care?.medicationList?.length) return null;
      return { pet, care };
    })
    .filter(Boolean) as Array<{
    pet: { id: number; name: string };
    care: CareInstructions;
  }>;

  if (petsWithMeds.length === 0) return null;

  const totalMeds = petsWithMeds.reduce(
    (sum, p) => sum + (p.care.medicationList?.length ?? 0),
    0,
  );

  const handleLoad = () => {
    const newItems: MedicationItem[] = [];
    for (const { pet, care } of petsWithMeds) {
      // Don't duplicate if already loaded for this pet
      if (medications.some((m) => m.petId === pet.id)) continue;
      const items = parseMedsFromProfile(care, pet.id);
      newItems.push(...items);
    }
    if (newItems.length > 0) {
      setMedications([...medications, ...newItems]);
    }
    setLoaded(true);
  };

  if (loaded) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5">
        <Check className="size-4 text-emerald-600" />
        <p className="text-xs font-medium text-emerald-700">
          Medication instructions loaded from{" "}
          {petsWithMeds.map((p) => p.pet.name).join(", ")}&apos;s profile
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-amber-600" />
          <div>
            <p className="text-xs font-semibold text-amber-800">
              Saved medications found
            </p>
            <p className="text-[11px] text-amber-600">
              {totalMeds} medication{totalMeds !== 1 ? "s" : ""} on file for{" "}
              {petsWithMeds.map((p) => p.pet.name).join(", ")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-amber-700 hover:bg-amber-100"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </Button>
          <Button
            size="sm"
            className="h-7 bg-amber-600 text-xs hover:bg-amber-700"
            onClick={handleLoad}
          >
            Load from profile
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-amber-200 bg-white/50 px-4 py-2.5">
          {petsWithMeds.map(({ pet, care }) => (
            <div key={pet.id} className="space-y-1">
              <p className="text-xs font-semibold text-amber-900">{pet.name}</p>
              {care.medicationList?.map((med, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-amber-200 text-[10px] text-amber-700"
                  >
                    {med.frequency}
                  </Badge>
                  <span className="text-[11px] text-amber-700">
                    {med.name} — {med.dosage}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
