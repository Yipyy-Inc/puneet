"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCreateLocation } from "@/lib/api/locations";
import { LOCATION_STATUSES, type LocationStatus } from "@/types/location";

// ============================================================================
// Opening a branch, for real.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// A 583-line five-step wizard — Basics, Address, Services, Staff, Pricing —
// whose finish button called `onCreate(loc)`, which pushed the object into
// `added-locations-store.ts`, a module-level array. It was gone on refresh, and
// on serverless it was not even shared between two requests of the same
// session.
//
// ── AND IT ASKS FOR LESS, ON PURPOSE ──────────────────────────────────────
//
// The wizard collected services, staff assignments and a pricing model.
// `public.locations` has nowhere to put any of them, and the real editors for
// all three already exist elsewhere. Asking somebody to assign five staff to a
// branch and then dropping the answer is worse than not asking — the same
// reason the signing dialog collects only the two fields `staff_signatures`
// holds.
//
// So this collects what a branch record IS. Everything else is set afterwards,
// in the screen that owns it.
// ============================================================================

const STATUS_LABEL: Record<LocationStatus, string> = {
  active: "Open and taking bookings",
  coming_soon: "Announced, not open yet",
  inactive: "Closed",
};

const COLORS = [
  { value: "#2563eb", className: "bg-blue-600" },
  { value: "#059669", className: "bg-emerald-600" },
  { value: "#d97706", className: "bg-amber-600" },
  { value: "#7c3aed", className: "bg-violet-600" },
  { value: "#db2777", className: "bg-pink-600" },
  { value: "#475569", className: "bg-slate-600" },
];

export function AddLocationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateLocation();

  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("Canada");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<LocationStatus>("active");
  const [isPrimary, setIsPrimary] = useState(false);
  const [color, setColor] = useState(COLORS[0].value);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setName("");
    setShortCode("");
    setStreet("");
    setCity("");
    setState("");
    setZipCode("");
    setCountry("Canada");
    setPhone("");
    setEmail("");
    setStatus("active");
    setIsPrimary(false);
    setColor(COLORS[0].value);
    setError(null);
    onOpenChange(false);
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("A location needs a name.");
      return;
    }
    setError(null);

    // Only send an address when there is one to send. A half-typed address
    // stored as five empty strings reads as "we have their address" to every
    // later screen.
    const address =
      street.trim() || city.trim() || zipCode.trim()
        ? {
            street: street.trim(),
            city: city.trim(),
            state: state.trim(),
            zipCode: zipCode.trim(),
            country: country.trim(),
          }
        : undefined;

    create.mutate(
      {
        name: trimmed,
        shortCode: shortCode.trim() || undefined,
        address,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        status,
        isPrimary,
        color,
      },
      {
        onSuccess: (location) => {
          toast.success(`${location.name} added`, {
            description: location.isPrimary
              ? "It is now this business's primary location."
              : undefined,
          });
          close();
        },
        // Stays open, holding what was typed. A duplicate short code or a
        // refused permission is something to correct, not to retype.
        onError: (err) => setError(err.message),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && !create.isPending && close()}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a location</DialogTitle>
          <DialogDescription>
            A branch of this business. Services, prices and staff are set
            afterwards, in the screens that own them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <div className="space-y-1.5">
              <Label htmlFor="loc-name">Name</Label>
              <Input
                id="loc-name"
                value={name}
                placeholder="Yipyy – Laval"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc-code">Short code</Label>
              <Input
                id="loc-code"
                value={shortCode}
                placeholder="LVL"
                maxLength={12}
                onChange={(e) => setShortCode(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="loc-street">Street</Label>
            <Input
              id="loc-street"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="loc-city">City</Label>
              <Input
                id="loc-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc-state">Province</Label>
              <Input
                id="loc-state"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc-zip">Postal code</Label>
              <Input
                id="loc-zip"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="loc-phone">Phone</Label>
              <Input
                id="loc-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc-email">Email</Label>
              <Input
                id="loc-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="loc-status">Status</Label>
            <Select
              value={status}
              onValueChange={(next) => setStatus(next as LocationStatus)}
            >
              <SelectTrigger id="loc-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {STATUS_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Colour</Label>
            <div className="flex gap-2">
              {COLORS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-label={`Colour ${option.value}`}
                  data-selected={color === option.value}
                  onClick={() => setColor(option.value)}
                  className={cn(
                    "size-7 rounded-lg ring-offset-2 transition-all data-[selected=true]:ring-2",
                    option.className,
                  )}
                />
              ))}
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="loc-primary">
                Make this the primary location
              </Label>
              <p className="text-muted-foreground text-xs">
                The one the business defaults to. Naming a new primary demotes
                the current one automatically.
              </p>
            </div>
            <Switch
              id="loc-primary"
              checked={isPrimary}
              onCheckedChange={setIsPrimary}
            />
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={close}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={create.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {create.isPending ? "Adding…" : "Add location"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
