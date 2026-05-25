"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Clock,
  GraduationCap,
  Sun,
  Sunrise,
  Sunset,
  type LucideIcon,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trainingQueries } from "@/lib/api/training";
import { cn } from "@/lib/utils";
import type { Client } from "@/types/client";
import type { TrainingPackage } from "@/types/training";
import type { TrainingSeries } from "@/lib/training-series";
import type { TrainingEnrollment } from "@/lib/training-enrollment";
import { hasCompletedPrerequisites } from "@/lib/training-program-prereqs";

type PreferredTimeOfDay = "morning" | "afternoon" | "no-preference";

const TIME_OPTIONS: { value: PreferredTimeOfDay; label: string; icon: LucideIcon }[] = [
  { value: "morning", label: "Morning", icon: Sunrise },
  { value: "afternoon", label: "Afternoon", icon: Sunset },
  { value: "no-preference", label: "Any time", icon: Sun },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When null, the dialog won't render its body — caller can mount it once
   *  and pass null when no waitlist context is active. */
  program: TrainingPackage | null;
  customer: Client;
  /** Series matching this program (sorted as the caller likes — we pick the
   *  earliest upcoming one to attach the waitlist entry to). */
  matchingSeries: TrainingSeries[];
}

export function ProgramWaitlistDialog({
  open,
  onOpenChange,
  program,
  customer,
  matchingSeries,
}: Props) {
  const queryClient = useQueryClient();
  const [petId, setPetId] = useState<string>("");
  const [preferredTime, setPreferredTime] =
    useState<PreferredTimeOfDay>("no-preference");
  const [notes, setNotes] = useState("");

  // Reset form whenever the dialog opens for a new program.
  useEffect(() => {
    if (open) {
      setPetId("");
      setPreferredTime("no-preference");
      setNotes("");
    }
  }, [open, program?.id]);

  // Earliest upcoming series of the program — that's the slot the waitlist
  // entry hangs off. The trainer manages position separately on the series
  // Waitlist tab; we just need a host record.
  const earliest = useMemo(() => {
    return matchingSeries
      .slice()
      .filter((s) => s.status === "upcoming")
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  }, [matchingSeries]);

  if (!program) return null;
  // Capture for the handler closure — TypeScript doesn't carry the early
  // return narrowing across function boundaries.
  const programName = program.name;

  const eligiblePets = customer.pets.filter((p) =>
    p.type === "Dog" ? hasCompletedPrerequisites(p.id, program) : false,
  );

  function handleSubmit() {
    if (!petId || !earliest) {
      toast.error(
        !earliest
          ? "No upcoming series to attach the waitlist entry to."
          : "Pick which pet you'd like to waitlist.",
      );
      return;
    }
    const numericPetId = Number(petId);
    const pet = customer.pets.find((p) => p.id === numericPetId);
    if (!pet) {
      toast.error("Pet not found.");
      return;
    }
    const nowISO = new Date().toISOString();
    const todayISO = nowISO.slice(0, 10);
    const newEnrollment: TrainingEnrollment = {
      id: `waitlist-${earliest.id}-${pet.id}-${Date.now()}`,
      seriesId: earliest.id,
      seriesName: earliest.seriesName,
      courseTypeId: earliest.courseTypeId,
      courseTypeName: earliest.courseTypeName,
      petId: pet.id,
      petName: pet.name,
      petBreed: pet.breed ?? "",
      ownerId: customer.id,
      ownerName: customer.name,
      ownerPhone: customer.phone ?? "",
      ownerEmail: customer.email ?? "",
      enrollmentDate: todayISO,
      status: "waitlisted",
      sessionsAttended: 0,
      totalSessions: earliest.numberOfWeeks,
      currentSessionNumber: 1,
      progress: 0,
      paymentStatus: "unpaid",
      notes: notes.trim(),
      preferredTimeOfDay: preferredTime,
      createdAt: nowISO,
      updatedAt: nowISO,
    };
    // Fan out through every cached series-enrollment list so the trainer's
    // Waitlist tab on the facility side picks up the new entry instantly.
    const cache = queryClient.getQueryCache();
    cache
      .findAll({ queryKey: ["training", "series-enrollments"] })
      .forEach((q) => {
        queryClient.setQueryData<TrainingEnrollment[]>(q.queryKey, (prev = []) => [
          ...prev,
          newEnrollment,
        ]);
      });
    cache.findAll({ queryKey: ["training", "series"] }).forEach((q) => {
      if (q.queryKey[3] !== "enrollments") return;
      // Only push into the matching series' cache so we don't pollute other
      // series' lists.
      if (q.queryKey[2] !== earliest.id) return;
      queryClient.setQueryData<TrainingEnrollment[]>(q.queryKey, (prev = []) => [
        ...prev,
        newEnrollment,
      ]);
    });
    toast.success(
      `You're on the waitlist for ${programName}.`,
      {
        description:
          "We'll text and email you the moment a spot opens. Sit tight!",
        duration: 6_000,
      },
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Clock className="size-5 text-amber-600" />
            Join the waitlist for {program.name}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            All upcoming series are at capacity. Add your dog to the waitlist
            and we&apos;ll text + email you the moment a spot opens.
            {earliest && (
              <span className="text-muted-foreground mt-1.5 inline-flex items-center gap-1 text-[11px]">
                <GraduationCap className="size-3" />
                You&apos;ll be queued on the earliest upcoming series, starting{" "}
                {formatLong(earliest.startDate)}.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Pet picker */}
          <div className="space-y-1.5">
            <Label htmlFor="waitlist-pet">
              Which dog? <span className="text-rose-600">*</span>
            </Label>
            <Select value={petId} onValueChange={setPetId}>
              <SelectTrigger id="waitlist-pet">
                <SelectValue placeholder="Pick your dog…" />
              </SelectTrigger>
              <SelectContent>
                {customer.pets
                  .filter((p) => p.type === "Dog")
                  .map((pet) => {
                    const eligible = hasCompletedPrerequisites(pet.id, program);
                    return (
                      <SelectItem
                        key={pet.id}
                        value={pet.id.toString()}
                        disabled={!eligible}
                      >
                        {pet.name}
                        {pet.breed ? ` · ${pet.breed}` : ""}
                        {!eligible && " (prerequisites incomplete)"}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
            {eligiblePets.length === 0 && (
              <p className="text-rose-600 text-[11px]">
                None of your dogs have completed the prerequisites for this
                program yet.
              </p>
            )}
          </div>

          {/* Preferred time of day */}
          <div className="space-y-1.5">
            <Label>Preferred time of day</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {TIME_OPTIONS.map((opt) => {
                const isActive = preferredTime === opt.value;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPreferredTime(opt.value)}
                    className={cn(
                      "flex h-10 items-center justify-center gap-1.5 rounded-md border text-[12px] font-medium transition-colors",
                      isActive
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="text-muted-foreground text-[11px]">
              We&apos;ll prioritize you for series matching this preference
              when possible.
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="waitlist-notes">
              Anything else? <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="waitlist-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g. 'Flexible on start date — please reach out anytime.'"
              className="min-h-[70px] text-sm"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!petId || !earliest}
            className="h-10 w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
          >
            <Clock className="mr-1.5 size-4" />
            Join Waitlist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatLong(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
