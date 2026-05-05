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
import { MapPin, Building2, Clock, Globe, Palette } from "lucide-react";
import { toast } from "sonner";
import type { Location } from "@/types/location";

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
  monday:    { open: "07:00", close: "19:00" },
  tuesday:   { open: "07:00", close: "19:00" },
  wednesday: { open: "07:00", close: "19:00" },
  thursday:  { open: "07:00", close: "19:00" },
  friday:    { open: "07:00", close: "18:00" },
  saturday:  { open: "08:00", close: "17:00" },
  sunday:    { open: "09:00", close: "15:00", closed: false },
};

export function AddLocationDialog({ open, onOpenChange, onCreate }: Props) {
  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[2].value);
  const [services, setServices] = useState<string[]>(["daycare"]);
  const [bookingSlug, setBookingSlug] = useState("");
  const [makePrimary, setMakePrimary] = useState(false);
  const [activeOnLaunch, setActiveOnLaunch] = useState(true);

  const toggleService = (svc: string) => {
    setServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc],
    );
  };

  const reset = () => {
    setName("");
    setShortCode("");
    setAddress("");
    setCity("");
    setPostalCode("");
    setPhone("");
    setEmail("");
    setColor(COLOR_OPTIONS[2].value);
    setServices(["daycare"]);
    setBookingSlug("");
    setMakePrimary(false);
    setActiveOnLaunch(true);
  };

  const isValid =
    name.trim().length > 0 &&
    shortCode.trim().length > 0 &&
    address.trim().length > 0 &&
    city.trim().length > 0 &&
    services.length > 0;

  const handleCreate = () => {
    const id = `loc-new-${Date.now()}`;
    const loc: Location = {
      id,
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
      isPrimary: makePrimary,
      services,
      capacity: {},
      hours: DEFAULT_HOURS,
      holidays: [],
      taxes: [
        { id: "gst", name: "GST", rate: 0.05, enabled: true },
        { id: "qst", name: "QST", rate: 0.09975, enabled: true },
      ],
      pricingOverride: false,
      pricing: [],
      staffAssignments: [],
      timezone: "America/Toronto",
      color,
      createdAt: new Date().toISOString().split("T")[0],
    };
    onCreate(loc);
    toast.success(`${loc.name} added — booking page live at /book/${bookingSlug || shortCode.toLowerCase()}`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-5" />
            Add New Location
          </DialogTitle>
          <DialogDescription>
            New branch under this account. Clients and pets stay shared — only
            calendar, staff, and inventory are scoped to this location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Identity */}
          <section className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold">Location name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Doggieville – Verdun"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Short code *</Label>
                <Input
                  value={shortCode}
                  onChange={(e) => setShortCode(e.target.value.toUpperCase().slice(0, 4))}
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
                      className={`size-7 rounded-md border-2 transition-all ${
                        color === c.value
                          ? "border-foreground scale-110"
                          : "border-transparent"
                      }`}
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
                <div className="flex h-9 items-center overflow-hidden rounded-md border bg-background">
                  <span className="text-muted-foreground border-r bg-muted/40 px-2 py-1 text-[11px]">
                    /book/
                  </span>
                  <input
                    value={bookingSlug}
                    onChange={(e) =>
                      setBookingSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                    }
                    placeholder={shortCode.toLowerCase() || "verdun"}
                    className="flex-1 bg-transparent px-2 text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Address & contact */}
          <section className="space-y-3 rounded-xl border bg-muted/20 p-3">
            <div className="flex items-center gap-2">
              <MapPin className="text-muted-foreground size-4" />
              <p className="text-sm font-semibold">Address & Contact</p>
            </div>
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
                  placeholder="verdun@doggieville.ca"
                />
              </div>
            </div>
          </section>

          {/* Services */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="text-muted-foreground size-4" />
              <Label className="text-sm font-semibold">Active services</Label>
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
                    className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {svc}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Operating hours preview */}
          <section className="space-y-2 rounded-xl border bg-muted/20 p-3">
            <div className="flex items-center gap-2">
              <Clock className="text-muted-foreground size-4" />
              <p className="text-sm font-semibold">Operating hours</p>
              <Badge variant="outline" className="text-[10px]">
                Default — edit after creation
              </Badge>
            </div>
            <p className="text-muted-foreground text-[11px]">
              Mon–Thu 7:00–19:00 · Fri 7:00–18:00 · Sat 8:00–17:00 · Sun 9:00–15:00
            </p>
          </section>

          {/* Flags */}
          <section className="space-y-3">
            <label className="flex cursor-pointer items-center justify-between rounded-lg border bg-background p-3">
              <div>
                <p className="text-sm font-semibold">Activate on launch</p>
                <p className="text-muted-foreground text-xs">
                  Visible to clients and ready for bookings immediately
                </p>
              </div>
              <Switch checked={activeOnLaunch} onCheckedChange={setActiveOnLaunch} />
            </label>
            <label className="flex cursor-pointer items-center justify-between rounded-lg border bg-background p-3">
              <div className="flex items-center gap-2">
                <Globe className="text-muted-foreground size-4" />
                <div>
                  <p className="text-sm font-semibold">Make this the primary location</p>
                  <p className="text-muted-foreground text-xs">
                    Some settings cascade from primary unless overridden
                  </p>
                </div>
              </div>
              <Switch checked={makePrimary} onCheckedChange={setMakePrimary} />
            </label>
          </section>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!isValid}>
            Create Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
