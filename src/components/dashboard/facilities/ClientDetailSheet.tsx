"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Calendar,
  DollarSign,
  Lock,
  Mail,
  MapPin,
  PawPrint,
  Phone,
  Wallet,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { bookings as allBookings } from "@/data/bookings";
import type { Client } from "@/types/client";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function fmtDate(iso?: string | null): string {
  return iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
}

function fmtMoney(n?: number | null): string {
  return n == null ? "—" : `$${n.toLocaleString()}`;
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
        {title}
      </p>
      {children}
    </div>
  );
}

export interface ClientDetailSheetProps {
  client: Client;
  facilityId: number;
  onClose: () => void;
}

export function ClientDetailSheet({
  client,
  facilityId,
  onClose,
}: ClientDetailSheetProps) {
  const clientBookings = allBookings
    .filter((b) => b.clientId === client.id && b.facilityId === facilityId)
    .slice()
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));

  const totalSpent = clientBookings
    .filter((b) => b.paymentStatus === "paid")
    .reduce((s, b) => s + (b.totalCost ?? 0), 0);

  const address = client.address;

  return (
    <Sheet
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b p-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
              {initials(client.name)}
            </div>
            <div className="min-w-0">
              <SheetTitle className="flex items-center gap-2 text-lg">
                {client.name}
                <StatusBadge type="status" value={client.status} />
                {client.isBlocked && (
                  <Badge variant="destructive">Blocked</Badge>
                )}
              </SheetTitle>
              <SheetDescription>Client profile · view only</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <div className="text-muted-foreground bg-muted/40 flex items-center gap-2 rounded-lg border p-2.5 text-xs">
            <Lock className="size-3.5 shrink-0" />
            View only — client records are managed by the facility and cannot be
            edited from the admin console.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat
              icon={DollarSign}
              label="Total Spent"
              value={fmtMoney(totalSpent)}
            />
            <Stat
              icon={Calendar}
              label="Last Visit"
              value={fmtDate(client.lastVisitDate)}
            />
            <Stat
              icon={AlertTriangle}
              label="No-Shows"
              value={String(client.noShowCount ?? 0)}
            />
            <Stat
              icon={Wallet}
              label="Outstanding"
              value={fmtMoney(client.outstandingBalance ?? 0)}
            />
          </div>

          <Section title="Contact">
            <div className="space-y-1.5 text-sm">
              <p className="flex items-center gap-2">
                <Mail className="text-muted-foreground size-4" />
                {client.email}
              </p>
              {client.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="text-muted-foreground size-4" />
                  {client.phone}
                </p>
              )}
              {address && (
                <p className="flex items-center gap-2">
                  <MapPin className="text-muted-foreground size-4" />
                  {[address.street, address.city, address.state, address.zip]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>
          </Section>

          <Section title={`Pet Records (${client.pets.length})`}>
            {client.pets.length === 0 ? (
              <p className="text-muted-foreground text-sm">No pets on file.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {client.pets.map((p) => (
                  <div key={p.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-medium">
                        <PawPrint className="size-3.5 shrink-0" />
                        {p.name}
                      </span>
                      {p.petStatus && p.petStatus !== "active" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize"
                        >
                          {p.petStatus}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {p.type} · {p.breed} · {p.age}y
                    </p>
                    {p.allergies && p.allergies !== "None" && (
                      <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                        Allergies: {p.allergies}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={`Booking History (${clientBookings.length})`}>
            {clientBookings.length === 0 ? (
              <p className="text-muted-foreground text-sm">No bookings yet.</p>
            ) : (
              <div className="space-y-2">
                {clientBookings.slice(0, 8).map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium capitalize">{b.service}</p>
                      <p className="text-muted-foreground text-xs">
                        {fmtDate(b.startDate)}
                        {b.endDate && b.endDate !== b.startDate
                          ? ` – ${fmtDate(b.endDate)}`
                          : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-medium tabular-nums">
                        {fmtMoney(b.totalCost)}
                      </p>
                      <div className="mt-0.5 flex items-center justify-end gap-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize"
                        >
                          {b.status}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] capitalize",
                            b.paymentStatus === "paid" &&
                              "border-emerald-200 text-emerald-700 dark:text-emerald-300",
                          )}
                        >
                          {b.paymentStatus}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
                {clientBookings.length > 8 && (
                  <p className="text-muted-foreground text-center text-xs">
                    Showing 8 of {clientBookings.length} bookings
                  </p>
                )}
              </div>
            )}
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
