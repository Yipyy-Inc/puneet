import {
  MapPin,
  Phone,
  Mail,
  Clock,
  PawPrint,
  Calendar,
  ChevronRight,
} from "lucide-react";
import type { Location } from "@/types/location";

const SERVICE_LABELS: Record<string, { label: string; sub: string; emoji: string }> = {
  daycare:  { label: "Daycare",  sub: "Full or half day care",     emoji: "☀️" },
  boarding: { label: "Boarding", sub: "Overnight stays",             emoji: "🌙" },
  grooming: { label: "Grooming", sub: "Bath, full groom, more",      emoji: "✂️" },
  training: { label: "Training", sub: "Group classes & 1-on-1",      emoji: "🎓" },
  transport:{ label: "Transport",sub: "Pick-up & drop-off",          emoji: "🚐" },
  spa:      { label: "Spa",      sub: "Premium pampering",           emoji: "💆" },
};

const DAY_LABELS: { key: keyof Location["hours"]; label: string }[] = [
  { key: "monday",    label: "Mon" },
  { key: "tuesday",   label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday",  label: "Thu" },
  { key: "friday",    label: "Fri" },
  { key: "saturday",  label: "Sat" },
  { key: "sunday",    label: "Sun" },
];

export function LocationBookingPage({ location }: { location: Location }) {
  return (
    <div className="min-h-screen bg-muted/20">
      {/* Hero header — branded with location color */}
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${location.color} 0%, ${location.color}dd 100%)`,
        }}
      >
        <div className="container mx-auto px-6 py-12 text-white">
          <div className="flex items-center gap-2 text-sm opacity-90">
            <PawPrint className="size-4" />
            Doggieville · {location.shortCode}
          </div>
          <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
            {location.name}
          </h1>
          <p className="mt-2 max-w-xl text-base opacity-90">
            Book directly at this location. Calendar, staff, and pricing on this
            page reflect what&apos;s available here.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              {location.address}, {location.city}
            </span>
            {location.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="size-4" />
                {location.phone}
              </span>
            )}
            {location.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="size-4" />
                {location.email}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto grid gap-6 px-6 py-10 md:grid-cols-3">
        {/* Services */}
        <div className="md:col-span-2 space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Choose a service</h2>
            <p className="text-muted-foreground text-sm">
              Available at {location.name}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {location.services.map((svc) => {
              const meta = SERVICE_LABELS[svc] ?? {
                label: svc,
                sub: "",
                emoji: "•",
              };
              const cap =
                location.capacity[svc as keyof typeof location.capacity];
              return (
                <button
                  key={svc}
                  className="group flex items-start gap-3 rounded-xl border bg-background p-4 text-left transition-all hover:shadow-md"
                  style={{
                    borderColor: `${location.color}33`,
                  }}
                >
                  <div
                    className="flex size-12 shrink-0 items-center justify-center rounded-lg text-2xl"
                    style={{ backgroundColor: `${location.color}1a` }}
                  >
                    {meta.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{meta.label}</p>
                    <p className="text-muted-foreground text-xs">{meta.sub}</p>
                    {cap !== undefined && (
                      <p className="mt-1 text-[11px]" style={{ color: location.color }}>
                        Capacity {cap}/day
                      </p>
                    )}
                  </div>
                  <ChevronRight className="text-muted-foreground size-4 self-center transition-transform group-hover:translate-x-0.5" />
                </button>
              );
            })}
          </div>

          <div
            className="mt-6 rounded-xl border p-4 text-sm"
            style={{
              borderColor: `${location.color}33`,
              backgroundColor: `${location.color}08`,
            }}
          >
            <p className="font-semibold" style={{ color: location.color }}>
              Existing client?
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Sign in with the email you used at any Doggieville location — your
              pets, vaccinations, and history transfer automatically.
            </p>
          </div>
        </div>

        {/* Sidebar — hours + branding card */}
        <aside className="space-y-4">
          <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
            <div className="border-b p-4" style={{ backgroundColor: `${location.color}10` }}>
              <div className="flex items-center gap-2">
                <Clock className="size-4" style={{ color: location.color }} />
                <p className="text-sm font-semibold">Hours</p>
              </div>
            </div>
            <div className="divide-y text-xs">
              {DAY_LABELS.map((d) => {
                const hrs = location.hours[d.key];
                const closed = hrs.closed;
                return (
                  <div
                    key={d.key}
                    className="flex items-center justify-between px-4 py-2"
                  >
                    <span className="font-medium">{d.label}</span>
                    <span
                      className={
                        closed ? "text-muted-foreground" : "tabular-nums"
                      }
                    >
                      {closed ? "Closed" : `${hrs.open}–${hrs.close}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border bg-background p-4">
            <div className="flex items-center gap-2">
              <Calendar className="text-muted-foreground size-4" />
              <p className="text-sm font-semibold">About this booking page</p>
            </div>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              You&apos;re booking with{" "}
              <strong style={{ color: location.color }}>{location.name}</strong>
              . If you usually visit a different Doggieville location, use the
              location switcher in your account. All your records carry across.
            </p>
          </div>
        </aside>
      </div>

      <footer className="border-t bg-background py-6 text-center text-xs text-muted-foreground">
        Booking with {location.name} · powered by Yipyy
      </footer>
    </div>
  );
}
