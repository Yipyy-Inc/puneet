"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  Truck,
  Pencil,
  Trash2,
  MapPin,
  Users,
  Map as MapIcon,
  CalendarDays,
  Hash,
  Circle,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMobileGrooming } from "@/hooks/use-mobile-grooming";
import { facilityStaff } from "@/data/facility-staff";
import type { MobileGroomingVan, ServiceArea } from "@/types/grooming";
import { formatDaysOfWeek } from "@/lib/service-areas";
import { CertainAreaForCertainDaysPanel } from "./certain-area-for-certain-days-panel";
import { ZoneAndTaxSettingsPanel } from "./zone-and-tax-settings-panel";
import { ServiceAreaDialog } from "./service-area-dialog";

const FACILITY_ID = 11;

// Same palette the service-area dialog uses — keeps the swatch set consistent
// across the create flow and the inline recolor on each list row.
const AREA_COLORS = [
  "#10b981",
  "#0ea5e9",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#84cc16",
  "#06b6d4",
  "#475569",
  "#0f172a",
];

function ColorPalette({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Area color
      </p>
      <div className="grid grid-cols-6 gap-1.5">
        {AREA_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            onClick={() => onChange(c)}
            style={{ backgroundColor: c }}
            className={cn(
              "size-6 rounded-full ring-2 ring-offset-2 ring-offset-background transition-transform",
              value === c
                ? "scale-110 ring-foreground"
                : "ring-transparent hover:scale-105",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function blankVan(): MobileGroomingVan {
  return {
    id: `van-${Date.now()}`,
    facilityId: FACILITY_ID,
    name: "",
    licensePlate: "",
    homeBaseAddress: "",
    assignedStaffIds: [],
    primaryDriverId: undefined,
    secondGroomerId: undefined,
    active: true,
    calendarColor: "#0ea5e9",
  };
}

function syncAssignedIds(v: MobileGroomingVan): MobileGroomingVan {
  // Keep the flat list in sync with the role split so downstream consumers
  // (payroll, calendar) can read either shape.
  const ids = [v.primaryDriverId, v.secondGroomerId].filter(
    (id): id is string => !!id,
  );
  return { ...v, assignedStaffIds: ids };
}

export function MobileGroomingSettings() {
  const {
    enabled,
    vans,
    serviceAreas,
    arrivalWindowMinutes,
    setEnabled,
    setArrivalWindowMinutes,
    addVan,
    updateVan,
    deleteVan,
    toggleVanActive,
    addServiceArea,
    updateServiceArea,
    deleteServiceArea,
    toggleServiceAreaActive,
  } = useMobileGrooming();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MobileGroomingVan | null>(null);
  const [form, setForm] = useState<MobileGroomingVan>(blankVan());

  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<ServiceArea | null>(null);

  const groomers = facilityStaff.filter((s) => s.primaryRole === "groomer");

  function openAdd() {
    setEditing(null);
    setForm(blankVan());
    setDialogOpen(true);
  }
  function openEdit(v: MobileGroomingVan) {
    setEditing(v);
    setForm({ ...v });
    setDialogOpen(true);
  }
  function save() {
    if (!form.name.trim()) {
      toast.error("Van name is required");
      return;
    }
    const synced = syncAssignedIds(form);
    if (editing) {
      updateVan(synced);
      toast.success("Van updated");
    } else {
      addVan(synced);
      toast.success("Van added");
    }
    setDialogOpen(false);
  }

  // (toggleStaff removed — replaced by primary driver + second groomer selects)

  function openAddArea() {
    setEditingArea(null);
    setAreaDialogOpen(true);
  }
  function openEditArea(a: ServiceArea) {
    setEditingArea(a);
    setAreaDialogOpen(true);
  }
  function handleAreaSave(next: ServiceArea) {
    if (editingArea) {
      updateServiceArea(next);
      toast.success("Service area updated");
    } else {
      addServiceArea(next);
      toast.success("Service area added");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Mobile Grooming</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Enable mobile grooming and configure the vans that show up as
            columns on the grooming calendar and on the Route Planner tab.
          </p>
        </div>
      </div>

      {/* Enable toggle */}
      <Card>
        <CardContent className="flex items-center justify-between gap-4 pt-5">
          <div>
            <p className="text-sm font-semibold">Enable mobile grooming</p>
            <p className="text-muted-foreground text-xs">
              When on, the Route Planner tab appears in the grooming module and
              each van shows as a column on the day-view calendar.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </CardContent>
      </Card>

      {/* Arrival window setting — only relevant when mobile is on */}
      {enabled && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Client Arrival Window</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground text-xs">
              Internal scheduling stays precise — but client confirmations and
              reminders show an arrival window centred on the appointment time.
              Set to 0 to keep showing the precise time.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {[0, 30, 60, 90, 120].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setArrivalWindowMinutes(m)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    arrivalWindowMinutes === m
                      ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300"
                      : "hover:bg-muted/40",
                  )}
                >
                  {m === 0
                    ? "Off — show precise time"
                    : m < 60
                      ? `${m} min`
                      : `${m / 60} h${m === 60 ? "" : ""}`}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1.5 text-xs">
                <Label className="text-[10px] uppercase text-muted-foreground">
                  Custom
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={240}
                  value={arrivalWindowMinutes}
                  onChange={(e) =>
                    setArrivalWindowMinutes(Number(e.target.value) || 0)
                  }
                  className="h-8 w-20 text-sm"
                />
                <span className="text-muted-foreground">min</span>
              </div>
            </div>
            {arrivalWindowMinutes > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Example: a 10:00 AM precise time becomes a{" "}
                <span className="font-mono">
                  {(() => {
                    const half = Math.floor(arrivalWindowMinutes / 2);
                    const start = 10 * 60 - half;
                    const end = 10 * 60 + (arrivalWindowMinutes - half);
                    const fmt = (n: number) => {
                      const h = Math.floor(n / 60);
                      const m = n % 60;
                      const ampm = h >= 12 ? "PM" : "AM";
                      const hour = h % 12 || 12;
                      return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
                    };
                    return `${fmt(start)} – ${fmt(end)}`;
                  })()}
                </span>{" "}
                window for the client.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {enabled && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Vans</h3>
            <Button onClick={openAdd} size="sm">
              <Plus className="mr-2 size-4" />
              Add Van
            </Button>
          </div>

          {vans.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <Truck className="text-muted-foreground size-8" />
                <p className="text-sm font-medium">No vans yet</p>
                <p className="text-muted-foreground text-xs">
                  Add your first van to start scheduling mobile bookings.
                </p>
                <Button onClick={openAdd} className="mt-2">
                  <Plus className="mr-2 size-4" />
                  Add Van
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {vans.map((v) => (
                <Card
                  key={v.id}
                  className={cn(
                    "overflow-hidden",
                    !v.active && "opacity-60",
                  )}
                >
                  <div
                    className="h-1 w-full"
                    style={{ backgroundColor: v.calendarColor ?? "#0ea5e9" }}
                    aria-hidden
                  />
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between gap-2 text-base">
                      <span className="flex items-center gap-2">
                        <Truck className="size-4 text-muted-foreground" />
                        {v.name || "(unnamed van)"}
                      </span>
                      <Badge variant={v.active ? "default" : "outline"}>
                        {v.active ? "Active" : "Inactive"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <span className="font-medium text-foreground">
                        {v.licensePlate || "—"}
                      </span>
                      <span>·</span>
                      <Users className="size-3" />
                      <span>
                        {v.assignedStaffIds.length} staff
                      </span>
                    </p>
                    <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
                      <MapPin className="mt-0.5 size-3 shrink-0" />
                      <span className="line-clamp-2">
                        {v.homeBaseAddress || "No home base address"}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Switch
                        checked={v.active}
                        onCheckedChange={() => toggleVanActive(v.id)}
                        className="scale-75"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto"
                        onClick={() => openEdit(v)}
                      >
                        <Pencil className="mr-1.5 size-3" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive/70 hover:text-destructive"
                        onClick={() => {
                          deleteVan(v.id);
                          toast.success("Van removed");
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {enabled && (
        <>
          <div className="flex items-center justify-between pt-2">
            <div>
              <h3 className="text-base font-semibold">Service Areas</h3>
              <p className="text-muted-foreground text-xs">
                Define where your vans operate. Online bookings get checked
                against the active area for the requested day.
              </p>
            </div>
            <Button onClick={openAddArea} size="sm">
              <Plus className="mr-2 size-4" />
              Add Area
            </Button>
          </div>

          {serviceAreas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <MapIcon className="text-muted-foreground size-8" />
                <p className="text-sm font-medium">No service areas yet</p>
                <p className="text-muted-foreground text-xs">
                  Without an area defined, online clients won&apos;t see
                  availability.
                </p>
                <Button onClick={openAddArea} className="mt-2">
                  <Plus className="mr-2 size-4" />
                  Add Service Area
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {serviceAreas.map((a) => {
                const TypeIcon =
                  a.type === "draw"
                    ? Pencil
                    : a.type === "postal"
                      ? Hash
                      : Circle;
                const typeLabel =
                  a.type === "draw"
                    ? "Drawn polygon"
                    : a.type === "postal"
                      ? "ZIP-based"
                      : "Radius-based";
                const color = a.color ?? "#10b981";
                const count =
                  a.type === "postal"
                    ? (a.postalCodes ?? []).length
                    : a.type === "draw"
                      ? (a.polygon ?? []).length
                      : (a.radiusKm ?? 0);
                const countLabel =
                  a.type === "postal"
                    ? `ZIP${count === 1 ? "" : "s"}`
                    : a.type === "draw"
                      ? `pt${count === 1 ? "" : "s"}`
                      : "km";
                return (
                  <Card
                    key={a.id}
                    className={cn(
                      "group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                      !a.active && "opacity-60",
                    )}
                  >
                    {/* Soft colored glow in the top-right corner */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full opacity-30 blur-3xl transition-opacity duration-300 group-hover:opacity-50"
                      style={{ backgroundColor: color }}
                    />
                    {/* Subtle dotted texture on the bottom-left */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -bottom-8 -left-8 size-32 rounded-full opacity-10 blur-2xl"
                      style={{ backgroundColor: color }}
                    />

                    <div className="relative space-y-3 p-4">
                      {/* Header row */}
                      <div className="flex items-start gap-3">
                        {/* Color avatar — clickable to recolor */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              aria-label="Change area color"
                              className="relative flex size-11 shrink-0 items-center justify-center rounded-xl shadow-md ring-2 ring-white/40 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-foreground"
                              style={{ backgroundColor: color }}
                            >
                              <TypeIcon className="size-5 text-white drop-shadow-sm" />
                              <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-card opacity-0 shadow ring-1 ring-border transition-opacity group-hover:opacity-100">
                                <Palette className="size-2.5 text-muted-foreground" />
                              </span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="start"
                            side="bottom"
                            className="w-auto p-2"
                          >
                            <ColorPalette
                              value={color}
                              onChange={(nextColor) => {
                                updateServiceArea({ ...a, color: nextColor });
                                toast.success(
                                  `${a.name || "Area"} recolored`,
                                );
                              }}
                            />
                          </PopoverContent>
                        </Popover>

                        {/* Name + type */}
                        <div className="min-w-0 flex-1 pt-0.5">
                          <h4 className="truncate font-semibold leading-tight">
                            {a.name || "(unnamed area)"}
                          </h4>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {typeLabel}
                          </p>
                        </div>

                        {/* Status pill */}
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1 rounded-full border bg-card/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider backdrop-blur",
                            a.active
                              ? "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300"
                              : "border-border text-muted-foreground",
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              a.active
                                ? "bg-emerald-500"
                                : "bg-muted-foreground/40",
                            )}
                          />
                          {a.active ? "Live" : "Off"}
                        </span>
                      </div>

                      {/* Stat chips */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-lg border bg-card/70 px-2 py-1 text-xs backdrop-blur"
                          style={{ borderColor: `${color}55` }}
                        >
                          <span
                            className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-md px-1 text-[10px] font-bold text-white"
                            style={{ backgroundColor: color }}
                          >
                            {count}
                          </span>
                          <span className="text-muted-foreground">
                            {countLabel}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-lg border bg-card/70 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur">
                          <CalendarDays className="size-3" />
                          {formatDaysOfWeek(a.daysOfWeek)}
                        </span>
                      </div>

                      {/* Detail line */}
                      {a.type === "postal" &&
                        a.postalCodes &&
                        a.postalCodes.length > 0 && (
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {a.postalCodes.slice(0, 6).join(" · ")}
                            {a.postalCodes.length > 6 &&
                              ` · +${a.postalCodes.length - 6} more`}
                          </p>
                        )}
                      {a.type === "radius" && (
                        <p className="truncate text-[11px] text-muted-foreground">
                          <MapPin className="mr-1 inline size-3" />
                          {a.centerAddress || "(no center address)"}
                        </p>
                      )}

                      {/* Footer */}
                      <div className="flex items-center gap-2 border-t border-dashed pt-3">
                        <Switch
                          checked={a.active}
                          onCheckedChange={() =>
                            toggleServiceAreaActive(a.id)
                          }
                          className="scale-75"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto gap-1.5"
                          onClick={() => openEditArea(a)}
                        >
                          <Pencil className="size-3" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive/70 hover:text-destructive"
                          onClick={() => {
                            deleteServiceArea(a.id);
                            toast.success("Service area removed");
                          }}
                          aria-label="Delete service area"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <CertainAreaForCertainDaysPanel />
          <ZoneAndTaxSettingsPanel />
        </>
      )}

      <ServiceAreaDialog
        open={areaDialogOpen}
        onOpenChange={(o) => {
          setAreaDialogOpen(o);
          if (!o) setEditingArea(null);
        }}
        initial={editingArea ?? undefined}
        otherAreas={serviceAreas}
        onSave={handleAreaSave}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Van" : "Add Van"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Van Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Van 1, Mobile Suds, etc."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">License Plate</Label>
              <Input
                value={form.licensePlate}
                onChange={(e) =>
                  setForm({ ...form, licensePlate: e.target.value })
                }
                placeholder="MG-4422"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Home Base Address</Label>
              <Input
                value={form.homeBaseAddress}
                onChange={(e) =>
                  setForm({ ...form, homeBaseAddress: e.target.value })
                }
                placeholder="Where the van returns at end of day"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Calendar Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.calendarColor ?? "#0ea5e9"}
                  onChange={(e) =>
                    setForm({ ...form, calendarColor: e.target.value })
                  }
                  className="h-9 w-14 cursor-pointer rounded-md border bg-transparent p-0.5"
                />
                <span className="text-muted-foreground font-mono text-xs uppercase">
                  {form.calendarColor}
                </span>
              </div>
            </div>
            <div className="space-y-3 rounded-lg border p-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Primary Driver <span className="text-destructive">*</span>
                </Label>
                <p className="text-muted-foreground text-[10px]">
                  Drives the van and leads the appointments.
                </p>
                <select
                  value={form.primaryDriverId ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      primaryDriverId: e.target.value || undefined,
                    })
                  }
                  className="h-9 w-full rounded-md border bg-card px-2 text-sm"
                >
                  <option value="">Choose a primary driver…</option>
                  {groomers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Second Groomer{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <p className="text-muted-foreground text-[10px]">
                  Rides along on busy days — both staff are credited for
                  payroll.
                </p>
                <select
                  value={form.secondGroomerId ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      secondGroomerId: e.target.value || undefined,
                    })
                  }
                  className="h-9 w-full rounded-md border bg-card px-2 text-sm"
                >
                  <option value="">No second groomer</option>
                  {groomers
                    .filter((s) => s.id !== form.primaryDriverId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <Label className="text-sm">Active</Label>
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!form.name.trim()} onClick={save}>
              {editing ? "Save Changes" : "Add Van"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
