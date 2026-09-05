"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Info,
  Star,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDeleteLocation,
  useFacilityLocations,
  useUpdateLocation,
} from "@/lib/api/locations";
import { useStaffHomeLocations, staffQueries } from "@/lib/api/staff";
import type { LocationPatchInput } from "@/lib/api/mappers/location";
import {
  LOCATION_CAPACITY_KEYS,
  LOCATION_STATUSES,
  type FacilityLocation,
  type LocationCapacityKey,
  type LocationStatus,
} from "@/types/location";
import {
  locationOnboardingSteps,
  type OnboardingStaffMember,
} from "@/lib/hq/location-onboarding";
import { settingsHref } from "@/lib/settings/nav";

// ============================================================================
// One branch — the record, edited for real.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// Four tabs over a fixture. Three of them saved into `location-detail-store`,
// a `useSyncExternalStore` overlay whose header said "Swap for a real mutation
// API when the backend lands", and raised "Location settings saved" over it.
//
// ── AND THREE OF THE FOUR DUPLICATED REAL EDITORS ─────────────────────────
//
// That is why this screen is small rather than converted wholesale. Building a
// second backend for them would create the disagreement this project keeps
// finding: two screens editing one fact, only one of them writing.
//
//   Services & Pricing  ->  Grooming > Rates, and each service's own rates
//   Staff / manager     ->  Staff, where a role and a home location are set
//   Hours, tax, rules   ->  Settings > Business
//
// What was genuinely missing is the branch record itself, and that is what is
// here: it writes to `public.locations`, gated by `manage_services` in RLS.
// ============================================================================

const STATUS_LABEL: Record<LocationStatus, string> = {
  active: "Open and taking bookings",
  coming_soon: "Announced, not open yet",
  inactive: "Closed",
};

const CAPACITY_LABEL: Record<LocationCapacityKey, string> = {
  daycare: "Daycare",
  boarding: "Boarding",
  grooming: "Grooming",
  training: "Training",
};

/** Where the tabs this screen used to imitate actually live. */
const ELSEWHERE = [
  {
    title: "Services and prices",
    detail:
      "What this business offers and what it charges — the grooming menu, room rates, package prices.",
    href: "/facility/dashboard/services/grooming/rates",
  },
  {
    title: "Staff and who manages this branch",
    detail:
      "Hiring, job titles, permissions, and the location a member of staff works from.",
    href: "/facility/dashboard/staff",
  },
  // One entry naming three unrelated things, because all three lived in the
  // same 8.2-screen "Business" section and one link was the best that could be
  // offered. They have their own addresses now, so this says three true things
  // instead of one vague one.
  {
    title: "Opening hours and closures",
    detail: "Trading hours, days you are closed, and one-off overrides.",
    href: settingsHref("hours"),
  },
  {
    title: "Booking rules",
    detail:
      "How far ahead customers may book, daily limits, and whether bookings need approval.",
    href: settingsHref("booking-rules"),
  },
  {
    title: "Tax rates",
    detail: "The rates applied to invoices, estimates and receipts.",
    href: settingsHref("taxes"),
  },
];

/** Go-live readiness for this one branch — the same steps HQ Settings'
 *  aggregate checklist shows, scoped to the branch you're looking at. */
function LocationOnboardingCard({
  location,
  staffAtLocation,
}: {
  location: FacilityLocation;
  staffAtLocation: OnboardingStaffMember[];
}) {
  const steps = locationOnboardingSteps(location, staffAtLocation);
  const done = steps.filter((step) => step.done).length;
  const missing = steps.filter((step) => !step.done);
  const ready = missing.length === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="size-4" />
          Onboarding checklist
        </CardTitle>
        <CardDescription>
          What this branch needs before it can go live.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs tabular-nums">
            {done}/{steps.length} steps
          </span>
          {ready ? (
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              Ready to go live
            </span>
          ) : (
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-3.5" />
              {missing.length} step{missing.length === 1 ? "" : "s"} remaining
            </span>
          )}
        </div>
        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              ready ? "bg-emerald-500" : "bg-amber-500",
            )}
            style={{ width: `${(done / steps.length) * 100}%` }}
          />
        </div>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {steps.map((step) => (
            <li key={step.label} className="flex items-center gap-1.5 text-xs">
              <CheckCircle2
                className={cn(
                  "size-3.5 shrink-0",
                  step.done ? "text-emerald-500" : "text-muted-foreground/40",
                )}
              />
              <span className={step.done ? "" : "text-muted-foreground"}>
                {step.label}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function LocationDetailView({ locationId }: { locationId: string }) {
  const router = useRouter();
  const { data, isPending, error } = useFacilityLocations();
  const update = useUpdateLocation();
  const remove = useDeleteLocation();
  const { data: staffHomeLocations } = useStaffHomeLocations();
  const { data: staffProfiles } = useQuery(staffQueries.profiles());

  const location = data?.find((item) => item.id === locationId) ?? null;

  // Real staff living at THIS branch -- same join HQ Settings' aggregate
  // checklist uses, scoped to one location.
  const staffAtLocation: OnboardingStaffMember[] = useMemo(() => {
    if (!location) return [];
    const profileByStaffId = new Map(
      (staffProfiles ?? []).map((p) => [p.id, p]),
    );
    const result: OnboardingStaffMember[] = [];
    for (const s of staffHomeLocations ?? []) {
      if (!s.claimed || s.homeLocationId !== location.id) continue;
      const profile = profileByStaffId.get(s.staffId);
      if (profile) result.push({ primaryRole: profile.primaryRole });
    }
    return result;
  }, [location, staffHomeLocations, staffProfiles]);

  if (isPending) return <DetailSkeleton />;

  if (error) {
    return (
      <div className="p-8">
        <p className="rounded-xl border border-red-200 bg-red-50 p-10 text-center text-sm text-red-800">
          {error.message}
        </p>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="flex-1 space-y-4 p-8">
        <h1 className="text-xl font-semibold">Location not found</h1>
        <p className="text-muted-foreground text-sm">
          It may have been removed, or it belongs to another business.
        </p>
        <Button asChild variant="outline">
          <Link href="/facility/hq/locations">Back to locations</Link>
        </Button>
      </div>
    );
  }

  return (
    <LocationEditor
      key={location.id}
      location={location}
      staffAtLocation={staffAtLocation}
      onSave={(patch) =>
        update.mutateAsync({ id: location.id, patch }).then(() => {
          toast.success("Location saved");
        })
      }
      saving={update.isPending}
      onRemove={() =>
        remove
          .mutateAsync(location.id)
          .then(() => {
            toast.success(`${location.name} removed`);
            router.push("/facility/hq/locations");
          })
          .catch((err: Error) => {
            // The database's refusal is written for the person who clicked and
            // names what to do instead ("set its status to inactive"), so it is
            // shown rather than flattened into "could not delete".
            toast.error("This location cannot be removed", {
              description: err.message,
            });
          })
      }
      removing={remove.isPending}
    />
  );
}

function LocationEditor({
  location,
  staffAtLocation,
  onSave,
  saving,
  onRemove,
  removing,
}: {
  location: FacilityLocation;
  staffAtLocation: OnboardingStaffMember[];
  onSave: (patch: LocationPatchInput) => Promise<void>;
  saving: boolean;
  onRemove: () => void;
  removing: boolean;
}) {
  const [name, setName] = useState(location.name);
  const [shortCode, setShortCode] = useState(location.shortCode ?? "");
  const [street, setStreet] = useState(location.address?.street ?? "");
  const [city, setCity] = useState(location.address?.city ?? "");
  const [state, setState] = useState(location.address?.state ?? "");
  const [zipCode, setZipCode] = useState(location.address?.zipCode ?? "");
  const [country, setCountry] = useState(location.address?.country ?? "");
  const [phone, setPhone] = useState(location.phone ?? "");
  const [email, setEmail] = useState(location.email ?? "");
  const [status, setStatus] = useState<LocationStatus>(location.status);
  const [capacity, setCapacity] = useState(location.capacity);
  const [error, setError] = useState<string | null>(null);

  // The list refetches after every write — including the one that demotes an
  // incumbent primary — so the row underneath these fields can change without
  // this component unmounting. Re-seed from it rather than showing a stale form.
  useEffect(() => {
    setStatus(location.status);
  }, [location.status]);

  const save = () => {
    setError(null);
    const hasAddress =
      street.trim() || city.trim() || zipCode.trim() || state.trim();
    onSave({
      name: name.trim(),
      shortCode: shortCode.trim() || null,
      address: hasAddress
        ? {
            street: street.trim(),
            city: city.trim(),
            state: state.trim(),
            zipCode: zipCode.trim(),
            country: country.trim(),
          }
        : null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      status,
      capacity,
    }).catch((err: Error) => setError(err.message));
  };

  const makePrimary = () => {
    setError(null);
    onSave({ isPrimary: true }).catch((err: Error) => setError(err.message));
  };

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="size-9">
            <Link href="/facility/hq/locations">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
              style={{ backgroundColor: location.color ?? "#475569" }}
            >
              {location.shortCode ?? location.name.slice(0, 3).toUpperCase()}
            </span>
            <div>
              <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
                <Link
                  href="/facility/hq/locations"
                  className="hover:text-foreground transition-colors"
                >
                  Locations
                </Link>
                <ChevronRight className="size-3" />
                <span>{location.shortCode ?? location.name}</span>
              </div>
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                <Building className="text-muted-foreground size-5" />
                {location.name}
                {location.isPrimary && (
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                )}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">The branch</CardTitle>
          <CardDescription>
            Saved for the whole business. Every screen that names a location
            reads this row.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-code">Short code</Label>
              <Input
                id="edit-code"
                value={shortCode}
                maxLength={12}
                onChange={(e) => setShortCode(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-street">Street</Label>
            <Input
              id="edit-street"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-city">City</Label>
              <Input
                id="edit-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-state">Province</Label>
              <Input
                id="edit-state"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-zip">Postal code</Label>
              <Input
                id="edit-zip"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-country">Country</Label>
              <Input
                id="edit-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={status}
                onValueChange={(next) => setStatus(next as LocationStatus)}
              >
                <SelectTrigger id="edit-status" className="w-full">
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
          </div>

          <div>
            <Label className="mb-2 block">Capacity</Label>
            <div className="grid gap-3 sm:grid-cols-4">
              {LOCATION_CAPACITY_KEYS.map((key) => (
                <div key={key} className="space-y-1.5">
                  <Label
                    htmlFor={`cap-${key}`}
                    className="text-muted-foreground text-xs font-normal"
                  >
                    {CAPACITY_LABEL[key]}
                  </Label>
                  <Input
                    id={`cap-${key}`}
                    type="number"
                    min={0}
                    placeholder="No limit"
                    value={capacity[key] ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setCapacity((prev) => {
                        const next = { ...prev };
                        // Cleared means "no stated limit", which is not zero —
                        // the key is removed rather than set to 0.
                        if (raw === "") delete next[key];
                        else next[key] = Math.max(0, Number(raw) || 0);
                        return next;
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <Button
              onClick={save}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? "Saving…" : "Save location"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <LocationOnboardingCard
        location={location}
        staffAtLocation={staffAtLocation}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="size-4" />
            The rest lives elsewhere
          </CardTitle>
          <CardDescription>
            This screen used to hold copies of these. Each is edited in one
            place now, so two screens cannot disagree about the same fact.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {ELSEWHERE.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="hover:bg-muted/50 flex items-center justify-between gap-3 rounded-md border px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-muted-foreground text-xs">{item.detail}</p>
              </div>
              <ArrowRight className="text-muted-foreground size-4 shrink-0" />
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Primary and removal</CardTitle>
          <CardDescription>
            A business has exactly one primary location — the one it defaults to
            when nothing else names a branch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="edit-primary">Primary location</Label>
              <p className="text-muted-foreground text-xs">
                {location.isPrimary
                  ? "This is the primary. Make another one primary to move it."
                  : "Making this the primary demotes the current one automatically."}
              </p>
            </div>
            <Switch
              id="edit-primary"
              checked={location.isPrimary}
              disabled={location.isPrimary || saving}
              onCheckedChange={(next) => next && makePrimary()}
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-red-200 p-3">
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium">Remove this location</p>
              <p className="text-muted-foreground text-xs">
                {location.bookingCount > 0
                  ? `${location.bookingCount.toLocaleString()} booking${
                      location.bookingCount === 1 ? "" : "s"
                    } happened here, so it cannot be removed — set its status to Closed instead.`
                  : "There is no booking history here, so it can be removed."}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onRemove}
              // The database refuses either way; this stops the click that can
              // only ever produce a refusal.
              disabled={removing || location.bookingCount > 0}
              className="shrink-0 gap-1.5 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
            >
              <Trash2 className="size-3.5" />
              {removing ? "Removing…" : "Remove"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <Skeleton className="h-12 w-72" />
      <Skeleton className="h-96 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}
