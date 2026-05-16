"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  LogIn,
  MapPin,
  Scissors,
  ClipboardEdit,
  Plus,
  Minus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useGroomingStations } from "@/hooks/use-grooming-stations";
import { isStationEligibleForPetSize } from "@/components/rooms/GroomingStationsClient";
import { groomingAddOnsList } from "@/data/grooming-pricing-rules";
import type { GroomingAppointment } from "@/types/grooming";
import type { GroomingStationPetSize } from "@/types/rooms";

const STATION_STATUS_LABEL: Record<string, string> = {
  available: "Available",
  "in-use": "In use",
  "needs-cleaning": "Needs cleaning",
};

export interface CheckInConfirmation {
  stationId: string;
  stationName: string;
  /** Add-ons after the groomer's last-minute edits (canonical names). */
  addOns: string[];
  /** Anything the owner mentioned at drop-off, or the groomer noticed. */
  dropOffObservations: string;
}

interface CheckInConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apt: GroomingAppointment | null;
  onConfirm: (result: CheckInConfirmation) => void;
}

export function CheckInConfirmationDialog({
  open,
  onOpenChange,
  apt,
  onConfirm,
}: CheckInConfirmationDialogProps) {
  const { stations } = useGroomingStations();
  const [stationId, setStationId] = useState<string>("");
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [observations, setObservations] = useState<string>("");

  // Seed local state from the appointment each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setStationId("");
    setSelectedAddOns(apt?.addOns ?? []);
    setObservations("");
  }, [open, apt?.id, apt?.addOns]);

  const eligibleStations = useMemo(() => {
    if (!apt) return [];
    return stations.filter(
      (s) =>
        s.active &&
        (s.status ?? "available") !== "out-of-service" &&
        isStationEligibleForPetSize(s, apt.petSize as GroomingStationPetSize),
    );
  }, [stations, apt]);

  if (!apt) return null;

  const inactiveAddOns = groomingAddOnsList.filter(
    (a) => a.isActive && !selectedAddOns.includes(a.name),
  );

  function toggleAddOn(name: string, on: boolean) {
    setSelectedAddOns((prev) =>
      on ? [...prev, name] : prev.filter((x) => x !== name),
    );
  }

  function handleConfirm() {
    const station = eligibleStations.find((s) => s.id === stationId);
    if (!station) return;
    onConfirm({
      stationId: station.id,
      stationName: station.name,
      addOns: selectedAddOns,
      dropOffObservations: observations.trim(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <LogIn className="size-4 text-emerald-600" />
            Check In — {apt.petName}
          </DialogTitle>
          <p className="text-muted-foreground text-xs">
            Confirm the station, service, and any drop-off observations. The
            appointment moves to <strong>In Progress</strong> after confirming.
          </p>
        </DialogHeader>

        {/* 1 · Station assignment */}
        <Section
          step={1}
          icon={MapPin}
          title="Station assignment"
          subtitle={`Pick the table or tub for this ${apt.petSize} pet.`}
        >
          {eligibleStations.length === 0 ? (
            <p className="text-muted-foreground py-3 text-center text-xs">
              No stations are currently sized for a {apt.petSize} pet.
            </p>
          ) : (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {eligibleStations.map((s) => {
                const status = s.status ?? "available";
                const occupied =
                  status === "in-use" || status === "needs-cleaning";
                const isSelected = stationId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={occupied}
                    onClick={() => setStationId(s.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                      isSelected
                        ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                        : "hover:bg-muted/40",
                      occupied && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="text-muted-foreground text-[11px] capitalize">
                        {STATION_STATUS_LABEL[status] ?? status}
                        {s.maxWeightLbs ? ` · max ${s.maxWeightLbs} lbs` : ""}
                      </p>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Section>

        <Separator />

        {/* 2 · Service + add-ons */}
        <Section
          step={2}
          icon={Scissors}
          title="Service & add-ons"
          subtitle="Last chance to change what's included before the session starts."
        >
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
              Package
            </p>
            <p className="font-medium">{apt.packageName}</p>
          </div>
          <div className="mt-3 space-y-2">
            <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
              Add-ons
            </p>
            {selectedAddOns.length === 0 ? (
              <p className="text-muted-foreground text-xs italic">
                No add-ons selected.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {selectedAddOns.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleAddOn(name, false)}
                    className="group flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                  >
                    {name}
                    <Minus className="size-3 opacity-60 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            )}
            {inactiveAddOns.length > 0 && (
              <div className="mt-2">
                <p className="text-muted-foreground mb-1 text-[10px] uppercase tracking-wide">
                  Add another
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {inactiveAddOns.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAddOn(a.name, true)}
                      className="flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs hover:bg-muted/60"
                    >
                      <Plus className="size-3" />
                      {a.name}
                      <span className="text-muted-foreground">
                        +${a.price}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        <Separator />

        {/* 3 · Drop-off observations */}
        <Section
          step={3}
          icon={ClipboardEdit}
          title="Drop-off observations"
          subtitle="Anything the owner mentioned, or you noticed coming in?"
        >
          <Textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="e.g. Owner mentioned a sore paw — be gentle with the back-left foot. Coat is more matted than last visit."
            rows={3}
            className="text-sm"
          />
          {apt.intake?.behaviorNotes && (
            <Badge
              variant="outline"
              className="mt-2 text-[10px] font-normal"
              title="Behavior notes already on file for this pet"
            >
              On file: {apt.intake.behaviorNotes}
            </Badge>
          )}
        </Section>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!stationId}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={handleConfirm}
          >
            <LogIn className="mr-1.5 size-4" />
            Confirm &amp; Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  step,
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  step: number;
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-2">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
          {step}
        </span>
        <Icon className="text-muted-foreground size-4" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      {subtitle && (
        <p className="text-muted-foreground mb-2 ml-8 text-xs">{subtitle}</p>
      )}
      <div className="ml-8">{children}</div>
    </div>
  );
}
