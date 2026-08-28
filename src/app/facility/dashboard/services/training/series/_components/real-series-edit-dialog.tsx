"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import { getDayName } from "@/lib/training-series";
import { useFacilityLocations } from "@/lib/api/locations";
import {
  useTrainingTrainers,
  assignableTrainers,
} from "@/lib/api/training-trainers";
import {
  useCreateTrainingSeries,
  useUpdateTrainingSeries,
} from "@/lib/api/training-series";
import type { RealTrainingSeries } from "@/types/training-series";

// ============================================================================
// Create/edit a real training series.
//
// A separate component from the mock `SeriesEditDialog` next to it, not an
// adaptation of it -- that dialog collects deposit/waitlist-toggle/drop-in
// fields nothing here reads, and the real API has no course-type catalogue
// to pick from (course_type_name is a label, not a foreign key). Once a
// series exists, its SCHEDULE (day, time, duration, start date, session
// count) is locked -- see the migration header for why regenerating sessions
// safely is its own, later change. Editing shows the schedule read-only and
// only the create form collects it.
// ============================================================================

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create. */
  editing: RealTrainingSeries | null;
}

const NONE = "__none__";

export function RealSeriesEditDialog({ open, onOpenChange, editing }: Props) {
  const { data: locations } = useFacilityLocations();
  const { data: trainers } = useTrainingTrainers();
  const create = useCreateTrainingSeries();
  const update = useUpdateTrainingSeries();

  const [name, setName] = useState(editing?.name ?? "");
  const [courseTypeName, setCourseTypeName] = useState(
    editing?.courseTypeName ?? "",
  );
  const [locationId, setLocationId] = useState(editing?.locationId ?? "");
  const [staffId, setStaffId] = useState(editing?.staffId ?? "");
  const [capacity, setCapacity] = useState(editing?.capacity ?? 8);
  const [totalPrice, setTotalPrice] = useState(editing?.totalPrice ?? 0);

  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("17:00");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [startDate, setStartDate] = useState("");
  const [numberOfSessions, setNumberOfSessions] = useState(6);

  const [error, setError] = useState<string | null>(null);
  const saving = create.isPending || update.isPending;

  // Re-seed from the row being edited each time the dialog opens for it --
  // this component unmounts/remounts via `key` in the parent, so this only
  // needs to run once, not track prop changes.
  if (open && editing && name === "" && editing.name !== "") {
    setName(editing.name);
    setCourseTypeName(editing.courseTypeName);
    setLocationId(editing.locationId ?? "");
    setStaffId(editing.staffId ?? "");
    setCapacity(editing.capacity);
    setTotalPrice(editing.totalPrice);
  }

  function save() {
    setError(null);
    if (!name.trim()) {
      setError("A series needs a name.");
      return;
    }

    if (editing) {
      update.mutate(
        {
          id: editing.id,
          patch: {
            name: name.trim(),
            courseTypeName,
            locationId: locationId || null,
            staffId: staffId || null,
            capacity,
            totalPrice,
          },
        },
        {
          onSuccess: () => {
            toast.success("Series updated");
            onOpenChange(false);
          },
          onError: (err: Error) => setError(err.message),
        },
      );
      return;
    }

    if (!startDate) {
      setError("A series needs a start date.");
      return;
    }

    create.mutate(
      {
        name: name.trim(),
        courseTypeName,
        dayOfWeek,
        startTime,
        durationMinutes,
        startDate,
        numberOfSessions,
        capacity,
        totalPrice,
        locationId: locationId || null,
        staffId: staffId || null,
      },
      {
        onSuccess: () => {
          toast.success("Series created");
          onOpenChange(false);
        },
        onError: (err: Error) => setError(err.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Series" : "Create Training Series"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "The schedule is locked once a series exists — cancel and create a new one to change it."
              : "Sessions are generated once, right after you save."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>
              Series Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Puppy Basics — Tuesday Evenings"
            />
          </div>

          <div className="space-y-2">
            <Label>Course Type</Label>
            <Input
              value={courseTypeName}
              onChange={(e) => setCourseTypeName(e.target.value)}
              placeholder="e.g., Puppy Class"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Location</Label>
              <Select
                value={locationId || NONE}
                onValueChange={(v) => setLocationId(v === NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Any location</SelectItem>
                  {(locations ?? []).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Instructor</Label>
              <Select
                value={staffId || NONE}
                onValueChange={(v) => setStaffId(v === NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {assignableTrainers(trainers).map((t) => (
                    <SelectItem key={t.staffId} value={t.staffId}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {editing ? (
            <div className="bg-muted/40 space-y-1 rounded-lg border p-3 text-sm">
              <p className="font-medium">Schedule (locked)</p>
              <p className="text-muted-foreground">
                {getDayName(editing.dayOfWeek)}s at {editing.startTime} ·{" "}
                {editing.durationMinutes} min · {editing.numberOfSessions}{" "}
                session{editing.numberOfSessions === 1 ? "" : "s"} starting{" "}
                {editing.startDate}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Start Date <span className="text-destructive">*</span>
                  </Label>
                  <DatePicker
                    value={startDate}
                    onValueChange={(v) => setStartDate(v ?? "")}
                    placeholder="Pick a date"
                    displayMode="dialog"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select
                    value={String(dayOfWeek)}
                    onValueChange={(v) => setDayOfWeek(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {getDayName(d)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <TimePickerLux
                    value={startTime}
                    onValueChange={setStartTime}
                    displayMode="dialog"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    min="15"
                    step="15"
                    value={durationMinutes}
                    onChange={(e) =>
                      setDurationMinutes(parseInt(e.target.value) || 60)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sessions</Label>
                  <Input
                    type="number"
                    min="1"
                    value={numberOfSessions}
                    onChange={(e) =>
                      setNumberOfSessions(parseInt(e.target.value) || 1)
                    }
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Capacity</Label>
              <Input
                type="number"
                min="0"
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Total Price ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={totalPrice}
                onChange={(e) => setTotalPrice(parseFloat(e.target.value) || 0)}
              />
              <p className="text-muted-foreground text-[11px]">
                Split evenly across sessions when a customer or staff member
                enrolls a pet.
              </p>
            </div>
          </div>

          {error && (
            <p className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {saving ? "Saving…" : editing ? "Save Changes" : "Create Series"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
