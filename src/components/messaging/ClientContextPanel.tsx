"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { TagList } from "@/components/shared/TagList";
import { User, PawPrint, Calendar, Clock, ExternalLink } from "lucide-react";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import type { Message } from "@/types/communications";

function SectionLabel({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 pb-2">
      <Icon className="text-muted-foreground size-3" />
      <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
        {label}
      </span>
    </div>
  );
}

export function ClientContextPanel({
  threadId,
  messages,
}: {
  threadId: string | null;
  messages: Message[];
}) {
  const clientId = useMemo(() => {
    if (!threadId) return null;
    const msg = messages.find((m) => (m.threadId ?? m.id) === threadId);
    return msg?.clientId ?? null;
  }, [threadId, messages]);

  const client = useMemo(
    () => (clientId ? clients.find((c) => c.id === clientId) : null),
    [clientId],
  );

  const clientBookings = useMemo(
    () =>
      clientId
        ? bookings
            .filter((b) => b.clientId === clientId)
            .sort(
              (a, b) =>
                new Date(b.startDate).getTime() -
                new Date(a.startDate).getTime(),
            )
        : [],
    [clientId],
  );

  const totalSpend = clientBookings.reduce((sum, b) => sum + b.totalCost, 0);
  const nextBooking = clientBookings.find(
    (b) => b.status === "confirmed" || b.status === "pending",
  );

  if (!client) {
    return (
      <div className="flex w-72 items-center justify-center border-l">
        <p className="text-muted-foreground text-xs">Select a conversation</p>
      </div>
    );
  }

  return (
    <div className="w-72 overflow-y-auto border-l">
      <div className="space-y-4 px-4 py-4">
        {/* Client */}
        <div>
          <SectionLabel icon={User} label="Client" />
          <div className="space-y-1">
            <Link
              href={`/facility/dashboard/clients/${client.id}`}
              className="flex items-center gap-1 text-sm font-semibold hover:underline"
            >
              {client.name}
              <ExternalLink className="text-muted-foreground size-3" />
            </Link>
            <p className="text-muted-foreground text-xs">{client.email}</p>
            {client.phone && (
              <p className="text-muted-foreground text-xs">{client.phone}</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Pets */}
        <div>
          <SectionLabel icon={PawPrint} label="Pets" />
          {client.pets.length === 0 ? (
            <p className="text-muted-foreground text-xs">No pets registered</p>
          ) : (
            <div className="space-y-2">
              {client.pets.map((pet) => (
                <div key={pet.id} className="space-y-1">
                  <Link
                    href={`/facility/dashboard/clients/${client.id}/pets/${pet.id}`}
                    className="text-xs font-medium hover:underline"
                  >
                    {pet.name}
                  </Link>
                  <p className="text-muted-foreground text-[10px]">
                    {pet.breed} · {pet.age}y · {pet.weight}lbs
                  </p>
                  <TagList
                    entityType="pet"
                    entityId={pet.id}
                    compact
                    maxVisible={3}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Next Appointment */}
        <div>
          <SectionLabel icon={Calendar} label="Next Appointment" />
          {nextBooking ? (
            <div className="space-y-0.5">
              <p className="text-xs font-medium capitalize">
                {nextBooking.service}
              </p>
              <p className="text-muted-foreground text-[10px]">
                {nextBooking.startDate}
                {nextBooking.checkInTime && ` · ${nextBooking.checkInTime}`}
              </p>
              {nextBooking.kennel && (
                <p className="text-muted-foreground text-[10px]">
                  {nextBooking.kennel}
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              No upcoming bookings
            </p>
          )}
        </div>

        <Separator />

        {/* Activity */}
        <div>
          <SectionLabel icon={Clock} label="Activity" />
          <div className="text-muted-foreground space-y-0.5 text-xs">
            <p>
              {clientBookings.length} booking
              {clientBookings.length !== 1 ? "s" : ""} total
            </p>
            <p className="font-[tabular-nums]">
              ${totalSpend.toFixed(2)} lifetime spend
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
