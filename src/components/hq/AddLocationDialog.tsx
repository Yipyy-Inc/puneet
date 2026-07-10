"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Building2,
  Clock,
  Globe,
  Palette,
  Users,
  DollarSign,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Location, LocationStaffAssignment } from "@/types/location";
import { sharedStaffPool } from "@/data/hq-analytics";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (loc: Location) => void;
}

const SERVICES_AVAILABLE = [
  "daycare",
  "boarding",
  "grooming",
  "training",
  "transport",
  "spa",
] as const;

const COLOR_OPTIONS = [
  { value: "#0ea5e9", label: "Sky" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#22c55e", label: "Emerald" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#f43f5e", label: "Rose" },
];

const DEFAULT_HOURS = {
  monday: { open: "07:00", close: "19:00" },
  tuesday: { open: "07:00", close: "19:00" },
  wednesday: { open: "07:00", close: "19:00" },
  thursday: { open: "07:00", close: "19:00" },
  friday: { open: "07:00", close: "18:00" },
  saturday: { open: "08:00", close: "17:00" },
  sunday: { open: "09:00", close: "15:00", closed: false },
};

type PricingModel = "inherit" | "per_location";

const STEPS = [
  { key: "basics", label: "Basics", icon: Building2 },
  { key: "address", label: "Address", icon: MapPin },
  { key: "services", label: "Services", icon: Palette },
  { key: "staff", label: "Staff", icon: Users },
  { key: "pricing", label: "Pricing", icon: DollarSign },
] as const;

function normalizeRole(role: string): string {
  return role.toLowerCase().replace(/\s+/g, "_");
}

export function AddLocationDialog({ open, onOpenChange, onCreate }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[2].value);
  const [services, setServices] = useState<string[]>(["daycare"]);
  const [staffIds, setStaffIds] = useState<string[]>([]);
  const [pricingModel, setPricingModel] = useState<PricingModel>("inherit");
  const [bookingSlug, setBookingSlug] = useState("");
  const [makePrimary, setMakePrimary] = useState(false);
  const [activeOnLaunch, setActiveOnLaunch] = useState(true);

  const toggleService = (svc: string) =>
    setServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc],
    );
  const toggleStaff = (id: string) =>
    setStaffIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );

  const reset = () => {
    setStep(0);
    setName("");
    setShortCode("");
    setAddress("");
    setCity("");
    setPostalCode("");
    setPhone("");
    setEmail("");
    setColor(COLOR_OPTIONS[2].value);
    setServices(["daycare"]);
    setStaffIds([]);
    setPricingModel("inherit");
    setBookingSlug("");
    setMakePrimary(false);
    setActiveOnLaunch(true);
  };

  const stepValid = (i: number): boolean => {
    switch (i) {
      case 0:
        return name.trim().length > 0 && shortCode.trim().length > 0;
      case 1:
        return address.trim().length > 0 && city.trim().length > 0;
      case 2:
        return services.length > 0;
      default:
        return true;
    }
  };
  const allValid = [0, 1, 2].every(stepValid);
  const isLast = step === STEPS.length - 1;

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleCreate = () => {
    const staffAssignments: LocationStaffAssignment[] = staffIds
      .map((id) => sharedStaffPool.find((s) => s.staffId === id))
      .filter((s): s is (typeof sharedStaffPool)[number] => Boolean(s))
      .map((s) => ({
        staffId: s.staffId,
        staffName: s.name,
        role: normalizeRole(s.role),
        isPrimary: true,
        scheduleConflictDetection: false,
      }));

    const loc: Location = {
      id: `loc-new-${Date.now()}`,
      facilityId: 11,
      name: name.trim(),
      shortCode: shortCode.trim().toUpperCase(),
      address: address.trim(),
      city: city.trim(),
      province: "QC",
      postalCode: postalCode.trim(),
      country: "CA",
      phone: phone.trim(),
      email: email.trim(),
      isActive: activeOnLaunch,
      status: activeOnLaunch ? "active" : "coming_soon",
      isPrimary: makePrimary,
      services,
      capacity: {},
      hours: DEFAULT_HOURS,
      holidays: [],
      taxes: [
        { id: "gst", name: "GST", rate: 0.05, enabled: true },
        { id: "qst", name: "QST", rate: 0.09975, enabled: true },
      ],
      pricingOverride: pricingModel === "per_location",
      pricing: [],
      staffAssignments,
      timezone: "America/Toronto",
      color,
      createdAt: new Date().toISOString().split("T")[0],
    };
    onCreate(loc);
    toast.success(
      `${loc.name} added — booking page live at /book/${bookingSlug || shortCode.toLowerCase()}`,
    );
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-5" />
            Add New Location
          </DialogTitle>
          <DialogDescription>
            Guided setup — step {step + 1} of {STEPS.length}. Clients and pets
            stay shared; calendar, staff, and pricing are scoped to this
            location.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <ol className="flex items-center gap-1.5">
          {STEPS.map((s, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <li key={s.key} className="flex flex-1 items-center gap-1.5">
                <button
                  type="button"
                  disabled={i > step && !allValid}
                  onClick={() => (i <= step || allValid) && setStep(i)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium transition-colors",
                    current
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "text-primary"
                        : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full text-[9px]",
                      current
                        ? "bg-primary-foreground text-primary"
                        : done
                          ? "bg-primary/15"
                          : "bg-muted",
                    )}
                  >
                    {done ? <Check className="size-2.5" /> : i + 1}
                  </span>
                  {s.label}
                </button>
                {i < STEPS.length - 1 && (
                  <span className="bg-border h-px flex-1" />
                )}
              </li>
            );
          })}
        </ol>

        <div className="min-h-76 space-y-4 py-2">
          {/* Step 1 — Basics */}
          {step === 0 && (
            <section className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">
                    Location name *
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Yipyy – Verdun"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Short code *</Label>
                  <Input
                    value={shortCode}
                    onChange={(e) =>
                      setShortCode(e.target.value.toUpperCase().slice(0, 4))
                    }
                    placeholder="VRD"
                    className="uppercase"
                    maxLength={4}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Color</Label>
                  <div className="flex gap-1.5">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setColor(c.value)}
                        className={cn(
                          "size-7 rounded-md border-2 transition-all",
                          color === c.value
                            ? "border-foreground scale-110"
                            : "border-transparent",
                        )}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Booking page URL slug
                  </Label>
                  <div className="bg-background flex h-9 items-center overflow-hidden rounded-md border">
                    <span className="text-muted-foreground bg-muted/40 border-r px-2 py-1 text-[11px]">
                      /book/
                    </span>
                    <input
                      value={bookingSlug}
                      onChange={(e) =>
                        setBookingSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, ""),
                        )
                      }
                      placeholder={shortCode.toLowerCase() || "verdun"}
                      className="flex-1 bg-transparent px-2 text-sm outline-none"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Step 2 — Address & contact */}
          {step === 1 && (
            <section className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Street address *</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 rue Wellington"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Postal code</Label>
                  <Input
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="H4G 1V8"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">City *</Label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Montréal"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(514) 555-0404"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="verdun@yipyy.com"
                  />
                </div>
              </div>
              <div className="bg-muted/20 space-y-2 rounded-xl border p-3">
                <div className="flex items-center gap-2">
                  <Clock className="text-muted-foreground size-4" />
                  <p className="text-sm font-semibold">Operating hours</p>
                  <Badge variant="outline" className="text-[10px]">
                    Default — edit after creation
                  </Badge>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Mon–Thu 7:00–19:00 · Fri 7:00–18:00 · Sat 8:00–17:00 · Sun
                  9:00–15:00
                </p>
              </div>
            </section>
          )}

          {/* Step 3 — Services */}
          {step === 2 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Palette className="text-muted-foreground size-4" />
                <Label className="text-sm font-semibold">
                  Services to enable *
                </Label>
                <span className="text-muted-foreground text-[11px]">
                  Pulls from master catalog — overrides editable later
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SERVICES_AVAILABLE.map((svc) => {
                  const active = services.includes(svc);
                  return (
                    <button
                      key={svc}
                      type="button"
                      onClick={() => toggleService(svc)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {svc}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Step 4 — Staff */}
          {step === 3 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="text-muted-foreground size-4" />
                <Label className="text-sm font-semibold">Staff to assign</Label>
                <span className="text-muted-foreground text-[11px]">
                  Optional — from the shared staff pool
                </span>
              </div>
              <div className="divide-y rounded-xl border">
                {sharedStaffPool.map((s) => {
                  const selected = staffIds.includes(s.staffId);
                  return (
                    <button
                      key={s.staffId}
                      type="button"
                      onClick={() => toggleStaff(s.staffId)}
                      className="hover:bg-muted/40 flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{s.name}</p>
                        <p className="text-muted-foreground text-[11px]">
                          {s.role} · home {s.primaryLocationName}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-md border",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input",
                        )}
                      >
                        {selected && <Check className="size-3.5" />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-muted-foreground text-[11px]">
                {staffIds.length} staff selected
              </p>
            </section>
          )}

          {/* Step 5 — Pricing model + launch */}
          {step === 4 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="text-muted-foreground size-4" />
                <Label className="text-sm font-semibold">Pricing model</Label>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  {
                    value: "inherit" as const,
                    title: "Inherit from network",
                    desc: "Use master catalog prices. Change once at HQ, applies here.",
                  },
                  {
                    value: "per_location" as const,
                    title: "Per-location pricing",
                    desc: "Override individual service prices for this branch.",
                  },
                ].map((opt) => {
                  const active = pricingModel === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPricingModel(opt.value)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-colors",
                        active
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/40",
                      )}
                    >
                      <p className="flex items-center gap-1.5 text-sm font-semibold">
                        {active && <Check className="text-primary size-3.5" />}
                        {opt.title}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              <label className="bg-background flex cursor-pointer items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-semibold">Activate on launch</p>
                  <p className="text-muted-foreground text-xs">
                    Visible to clients immediately. Off = marked “Coming Soon”.
                  </p>
                </div>
                <Switch
                  checked={activeOnLaunch}
                  onCheckedChange={setActiveOnLaunch}
                />
              </label>
              <label className="bg-background flex cursor-pointer items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Globe className="text-muted-foreground size-4" />
                  <div>
                    <p className="text-sm font-semibold">
                      Make this the primary location
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Some settings cascade from primary unless overridden
                    </p>
                  </div>
                </div>
                <Switch
                  checked={makePrimary}
                  onCheckedChange={setMakePrimary}
                />
              </label>
            </section>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="ghost"
            onClick={() =>
              step === 0 ? handleClose(false) : setStep(step - 1)
            }
          >
            {step === 0 ? (
              "Cancel"
            ) : (
              <>
                <ChevronLeft className="mr-1 size-4" />
                Back
              </>
            )}
          </Button>
          {isLast ? (
            <Button onClick={handleCreate} disabled={!allValid}>
              Create Location
            </Button>
          ) : (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!stepValid(step)}
            >
              Next
              <ChevronRight className="ml-1 size-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
