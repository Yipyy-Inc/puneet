"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowRightLeft,
  CheckCircle2,
  CircleDollarSign,
  MoreHorizontal,
  PawPrint,
  Plus,
  StickyNote,
  Trash2,
  UserMinus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trainingQueries } from "@/lib/api/training";
import type {
  SeriesPaymentStatus,
  TrainingEnrollment,
} from "@/lib/training-enrollment";
import type { TrainingSeries } from "@/lib/training-series";
import { clients } from "@/data/clients";

const PAYMENT_META: Record<
  SeriesPaymentStatus,
  { label: string; cls: string }
> = {
  paid: {
    label: "Paid",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  deposit: {
    label: "Deposit",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
  },
  unpaid: {
    label: "Unpaid",
    cls: "bg-rose-100 text-rose-700 border-rose-200",
  },
  refunded: {
    label: "Refunded",
    cls: "bg-slate-100 text-slate-600 border-slate-200",
  },
  comped: {
    label: "Comped",
    cls: "bg-violet-100 text-violet-700 border-violet-200",
  },
};

const STATUS_META: Record<
  TrainingEnrollment["status"],
  { label: string; cls: string }
> = {
  enrolled: {
    label: "Enrolled",
    cls: "bg-sky-100 text-sky-700 border-sky-200",
  },
  completed: {
    label: "Completed",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  dropped: {
    label: "Dropped",
    cls: "bg-rose-100 text-rose-700 border-rose-200",
  },
  waitlisted: {
    label: "Waitlisted",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
  },
};

export function SeriesStudentsTab({ series }: { series: TrainingSeries }) {
  const queryClient = useQueryClient();
  const { data: serverEnrollments = [] } = useQuery(
    trainingQueries.seriesEnrollments(series.id),
  );
  const { data: allSeries = [] } = useQuery(trainingQueries.series());

  // Mirror the series-list pattern: layer optimistic overrides on top of the
  // mock-driven server list so add/remove/drop/move read back immediately.
  const [overrides, setOverrides] = useState<
    Record<string, TrainingEnrollment | null>
  >({});

  const enrollments = useMemo(() => {
    const out: TrainingEnrollment[] = [];
    const seen = new Set<string>();
    for (const e of serverEnrollments) {
      if (overrides[e.id] === null) continue;
      out.push(overrides[e.id] ?? e);
      seen.add(e.id);
    }
    for (const [id, ov] of Object.entries(overrides)) {
      if (!ov) continue;
      if (seen.has(id)) continue;
      if (ov.seriesId !== series.id) continue;
      out.push(ov);
    }
    return out;
  }, [serverEnrollments, overrides, series.id]);

  // Add Student dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [addPetKey, setAddPetKey] = useState<string>(""); // "<clientId>:<petId>"
  const [addPayment, setAddPayment] = useState<SeriesPaymentStatus>("deposit");
  const [addNotes, setAddNotes] = useState("");

  // Remove confirmation
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Drop confirmation
  const [droppingId, setDroppingId] = useState<string | null>(null);

  // Move-series dialog
  const [movingId, setMovingId] = useState<string | null>(null);
  const [moveTargetSeriesId, setMoveTargetSeriesId] = useState("");

  // Dogs from the clients mock for the Add Student picker.
  const petOptions = useMemo(() => {
    const out: {
      key: string;
      petId: number;
      petName: string;
      petBreed: string;
      ownerId: number;
      ownerName: string;
      ownerPhone: string;
      ownerEmail: string;
    }[] = [];
    for (const c of clients) {
      for (const p of c.pets) {
        if (p.type !== "Dog") continue;
        out.push({
          key: `${c.id}:${p.id}`,
          petId: p.id,
          petName: p.name,
          petBreed: p.breed,
          ownerId: c.id,
          ownerName: c.name,
          ownerPhone: c.phone ?? "",
          ownerEmail: c.email,
        });
      }
    }
    return out.sort((a, b) => a.petName.localeCompare(b.petName));
  }, []);

  const otherSeriesOptions = useMemo(() => {
    return allSeries
      .filter(
        (s) =>
          s.id !== series.id &&
          s.courseTypeId === series.courseTypeId &&
          (s.status === "upcoming" || s.status === "active"),
      )
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [allSeries, series.id, series.courseTypeId]);

  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: ["training", "series", series.id, "enrollments"],
    });
  }

  function handleAdd() {
    if (!addPetKey) {
      toast.error("Pick a dog to enroll.");
      return;
    }
    const pet = petOptions.find((p) => p.key === addPetKey);
    if (!pet) return;
    const id = `series-enroll-${series.id}-new-${Date.now()}`;
    const next: TrainingEnrollment = {
      id,
      seriesId: series.id,
      seriesName: series.seriesName,
      courseTypeId: series.courseTypeId,
      courseTypeName: series.courseTypeName,
      petId: pet.petId,
      petName: pet.petName,
      petBreed: pet.petBreed,
      ownerId: pet.ownerId,
      ownerName: pet.ownerName,
      ownerPhone: pet.ownerPhone,
      ownerEmail: pet.ownerEmail,
      enrollmentDate: new Date().toISOString().split("T")[0],
      status: "enrolled",
      sessionsAttended: 0,
      totalSessions: series.numberOfWeeks,
      currentSessionNumber: 1,
      progress: 0,
      paymentStatus: addPayment,
      notes: addNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setOverrides((prev) => ({ ...prev, [id]: next }));
    toast.success(`${pet.petName} enrolled in ${series.seriesName}.`);
    setAddOpen(false);
    setAddPetKey("");
    setAddPayment("deposit");
    setAddNotes("");
    invalidate();
  }

  function handleRemove() {
    if (!removingId) return;
    setOverrides((prev) => ({ ...prev, [removingId]: null }));
    toast.success("Student removed from this series.");
    setRemovingId(null);
    invalidate();
  }

  function handleDrop() {
    if (!droppingId) return;
    const target = enrollments.find((e) => e.id === droppingId);
    if (!target) return;
    setOverrides((prev) => ({
      ...prev,
      [droppingId]: {
        ...target,
        status: "dropped",
        updatedAt: new Date().toISOString(),
      },
    }));
    toast.success(`${target.petName} marked as dropped.`);
    setDroppingId(null);
    invalidate();
  }

  function handleMove() {
    if (!movingId || !moveTargetSeriesId) return;
    const target = enrollments.find((e) => e.id === movingId);
    const dest = allSeries.find((s) => s.id === moveTargetSeriesId);
    if (!target || !dest) return;
    // Pull the student out of this series and seed a fresh enrollment for the
    // destination series so the move lands in the right roster.
    setOverrides((prev) => ({
      ...prev,
      [target.id]: null,
      [`${target.id}-moved-${dest.id}`]: {
        ...target,
        id: `${target.id}-moved-${dest.id}`,
        seriesId: dest.id,
        seriesName: dest.seriesName,
        courseTypeId: dest.courseTypeId,
        courseTypeName: dest.courseTypeName,
        sessionsAttended: 0,
        currentSessionNumber: 1,
        progress: 0,
        status: "enrolled",
        updatedAt: new Date().toISOString(),
      },
    }));
    toast.success(`${target.petName} moved to ${dest.seriesName}.`);
    setMovingId(null);
    setMoveTargetSeriesId("");
    invalidate();
    queryClient.invalidateQueries({
      queryKey: ["training", "series", dest.id, "enrollments"],
    });
  }

  const columns: ColumnDef<TrainingEnrollment>[] = [
    {
      key: "ownerName",
      label: "Owner",
      sortable: true,
      render: (e) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800">{e.ownerName}</span>
          {e.ownerPhone && (
            <span className="text-muted-foreground text-[11px]">
              {e.ownerPhone}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "petName",
      label: "Dog",
      sortable: true,
      render: (e) => (
        <div className="flex items-center gap-2">
          <div className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full">
            <PawPrint className="text-muted-foreground size-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800">{e.petName}</span>
            <span className="text-muted-foreground text-[11px]">
              {e.petBreed}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "sessionsAttended",
      label: "Sessions Attended",
      sortable: true,
      sortValue: (e) => e.sessionsAttended / Math.max(e.totalSessions, 1),
      render: (e) => {
        const pct =
          e.totalSessions > 0
            ? Math.round((e.sessionsAttended / e.totalSessions) * 100)
            : 0;
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tabular-nums">
              {e.sessionsAttended}/{e.totalSessions}
            </span>
            <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full transition-all",
                  pct >= 80
                    ? "bg-emerald-500"
                    : pct >= 40
                      ? "bg-sky-500"
                      : "bg-amber-500",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "paymentStatus",
      label: "Payment",
      sortable: true,
      render: (e) => {
        const meta = PAYMENT_META[e.paymentStatus];
        return (
          <Badge variant="outline" className={cn("gap-1 border", meta.cls)}>
            <CircleDollarSign className="size-3" />
            {meta.label}
          </Badge>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (e) => {
        const meta = STATUS_META[e.status];
        return (
          <Badge variant="outline" className={cn("border", meta.cls)}>
            {meta.label}
          </Badge>
        );
      },
    },
    {
      key: "notes",
      label: "Notes",
      sortable: false,
      render: (e) =>
        e.notes ? (
          <span
            className="text-muted-foreground line-clamp-2 max-w-[260px] text-xs"
            title={e.notes}
          >
            <StickyNote className="mr-1 inline size-3 align-text-bottom" />
            {e.notes}
          </span>
        ) : (
          <span className="text-muted-foreground/40 text-xs">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          <span className="font-semibold text-slate-800 tabular-nums">
            {enrollments.length}
          </span>{" "}
          of{" "}
          <span className="tabular-nums">{series.maxCapacity}</span> spots
          filled
        </p>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={series.status === "cancelled"}
        >
          <Plus className="mr-1.5 size-4" />
          Add Student
        </Button>
      </div>

      <DataTable
        data={enrollments}
        columns={columns}
        searchPlaceholder="Search students by owner, dog, or breed…"
        getSearchValue={(e) =>
          [e.ownerName, e.petName, e.petBreed].join(" ")
        }
        itemsPerPage={10}
        actions={(e) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Student actions"
                onClick={(ev) => ev.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Student actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setMovingId(e.id)}
                className="gap-2"
              >
                <ArrowRightLeft className="size-4" />
                Move to another series
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={e.status === "dropped"}
                onClick={() => setDroppingId(e.id)}
                className="gap-2"
              >
                <UserMinus className="size-4" />
                Mark as dropped
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setRemovingId(e.id)}
                className="text-destructive focus:text-destructive gap-2"
              >
                <Trash2 className="size-4" />
                Remove from series
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      {/* Add Student dialog ──────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a student</DialogTitle>
            <DialogDescription>
              Enroll a dog into{" "}
              <span className="font-semibold text-slate-800">
                {series.seriesName}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Dog</Label>
              <Select value={addPetKey} onValueChange={setAddPetKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a dog…" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {petOptions.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {p.petName} · {p.ownerName} ({p.petBreed})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Payment</Label>
              <Select
                value={addPayment}
                onValueChange={(v) =>
                  setAddPayment(v as SeriesPaymentStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid in full</SelectItem>
                  <SelectItem value="deposit">Deposit only</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="comped">Comped</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Notes (optional)</Label>
              <Textarea
                value={addNotes}
                onChange={(ev) => setAddNotes(ev.target.value)}
                placeholder="Anything the instructor should know…"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Enroll student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move dialog ────────────────────────────────────────────────── */}
      <Dialog
        open={!!movingId}
        onOpenChange={(open) => {
          if (!open) {
            setMovingId(null);
            setMoveTargetSeriesId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move student to another series</DialogTitle>
            <DialogDescription>
              Only active or upcoming series of the same course type are shown
              as destinations. Sessions attended in this series reset on move.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-2">
            <Label className="text-sm font-semibold">Destination series</Label>
            <Select
              value={moveTargetSeriesId}
              onValueChange={setMoveTargetSeriesId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a series…" />
              </SelectTrigger>
              <SelectContent>
                {otherSeriesOptions.length === 0 ? (
                  <div className="text-muted-foreground px-3 py-2 text-xs">
                    No other active or upcoming series for this course type.
                  </div>
                ) : (
                  otherSeriesOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.seriesName} · starts{" "}
                      {new Date(s.startDate + "T00:00:00").toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" },
                      )}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMovingId(null);
                setMoveTargetSeriesId("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleMove} disabled={!moveTargetSeriesId}>
              <CheckCircle2 className="mr-1 size-4" />
              Confirm move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drop confirmation ──────────────────────────────────────────── */}
      <AlertDialog
        open={!!droppingId}
        onOpenChange={(open) => !open && setDroppingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this student as dropped?</AlertDialogTitle>
            <AlertDialogDescription>
              They&apos;ll stay on the roster but won&apos;t be expected at
              future sessions. You can re-enroll them later if they come back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDrop}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              Mark as dropped
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove confirmation ────────────────────────────────────────── */}
      <AlertDialog
        open={!!removingId}
        onOpenChange={(open) => !open && setRemovingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from this series?</AlertDialogTitle>
            <AlertDialogDescription>
              Removing a student erases their roster entry for this series.
              Use &quot;Mark as dropped&quot; if you want to keep the record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
