"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TagList } from "@/components/shared/TagList";
import {
  User,
  PawPrint,
  Calendar,
  Phone,
  Mail,
  ExternalLink,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import type { Message } from "@/types/communications";

const AVATAR_COLORS = [
  "bg-amber-100 text-amber-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
];

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ClientContextPanel({
  threadId,
  messages,
  onClose,
}: {
  threadId: string | null;
  messages: Message[];
  onClose: () => void;
}) {
  const clientId = useMemo(() => {
    if (!threadId) return null;
    const msg = messages.find((m) => (m.threadId ?? m.id) === threadId);
    return msg?.clientId ?? null;
  }, [threadId, messages]);

  const client = clientId ? clients.find((c) => c.id === clientId) : null;

  const clientBookings = useMemo(() => {
    if (!clientId) return [];
    return bookings
      .filter((b) => b.clientId === clientId)
      .sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      );
  }, [clientId]);

  const upcoming = clientBookings.filter(
    (b) => new Date(b.startDate) > new Date() && b.status !== "cancelled",
  );
  const completed = clientBookings.filter((b) => b.status === "completed");
  const nextBooking = upcoming[0];
  const lastBooking = completed[0];
  const totalSpend = clientBookings.reduce((s, b) => s + b.totalCost, 0);

  if (!client) {
    return (
      <div className="flex h-full w-80 flex-col items-center justify-center border-l bg-white">
        <User className="text-muted-foreground/30 size-8" />
        <p className="text-muted-foreground mt-2 text-sm">
          Select a conversation
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-80 flex-col border-l bg-white">
      {/* Header with close */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
          Client Details
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Client avatar + info */}
        <div className="flex flex-col items-center px-4 py-5">
          {(client as Record<string, unknown>)?.imageUrl ? (
            <img
              src={(client as Record<string, unknown>).imageUrl as string}
              alt={client.name}
              className="size-16 rounded-full object-cover ring-2 ring-slate-100"
            />
          ) : (
            <div
              className={cn(
                "flex size-16 items-center justify-center rounded-full text-lg font-bold",
                getAvatarColor(client.name),
              )}
            >
              {getInitials(client.name)}
            </div>
          )}
          <h3 className="mt-2 text-base font-semibold">{client.name}</h3>
          <div className="mt-1">
            <TagList entityType="customer" entityId={client.id} />
          </div>

          {/* Quick actions */}
          <div className="mt-3 flex gap-2">
            {client.phone && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                asChild
              >
                <a href={`tel:${client.phone}`}>
                  <Phone className="size-3" />
                  Call
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              asChild
            >
              <a href={`mailto:${client.email}`}>
                <Mail className="size-3" />
                Email
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              asChild
            >
              <Link href={`/facility/dashboard/clients/${client.id}`}>
                <ExternalLink className="size-3" />
                Profile
              </Link>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-1 px-4 py-3">
          <div className="text-center">
            <p className="text-lg font-bold text-slate-800 tabular-nums">
              {upcoming.length}
            </p>
            <p className="text-[9px] font-semibold tracking-wider text-slate-400 uppercase">
              Upcoming
            </p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-800 tabular-nums">
              {completed.length}
            </p>
            <p className="text-[9px] font-semibold tracking-wider text-slate-400 uppercase">
              Completed
            </p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-800 tabular-nums">
              $
              {totalSpend > 999
                ? `${(totalSpend / 1000).toFixed(1)}k`
                : totalSpend}
            </p>
            <p className="text-[9px] font-semibold tracking-wider text-slate-400 uppercase">
              Lifetime
            </p>
          </div>
        </div>

        <Separator />

        {/* Pets */}
        <div className="px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5">
            <PawPrint className="size-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-600">Pets</span>
          </div>
          <div className="space-y-2">
            {client.pets.map((pet) => (
              <Link
                key={pet.id}
                href={`/facility/dashboard/clients/${client.id}/pets/${pet.id}`}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50"
              >
                {pet.imageUrl ? (
                  <img
                    src={pet.imageUrl}
                    alt={pet.name}
                    className="size-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-8 items-center justify-center rounded-full bg-slate-100">
                    <PawPrint className="size-3.5 text-slate-400" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium">{pet.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {pet.breed} · {pet.type}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <Separator />

        {/* Next Appointment */}
        <div className="px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Calendar className="size-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-600">
              Next Appointment
            </span>
          </div>
          {nextBooking ? (
            <div className="rounded-lg border bg-slate-50 p-2.5">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] capitalize">
                  {nextBooking.service}
                </Badge>
                <span className="text-xs font-medium tabular-nums">
                  ${nextBooking.totalCost}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                {new Date(nextBooking.startDate).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
                {nextBooking.checkInTime && ` at ${nextBooking.checkInTime}`}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs italic">
              No upcoming appointments
            </p>
          )}
        </div>

        <Separator />

        {/* Contact */}
        <div className="px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5">
            <User className="size-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-600">
              Contact Info
            </span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-600">
            <p className="flex items-center gap-2">
              <Mail className="size-3 text-slate-400" />
              {client.email}
            </p>
            {client.phone && (
              <p className="flex items-center gap-2">
                <Phone className="size-3 text-slate-400" />
                {client.phone}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
