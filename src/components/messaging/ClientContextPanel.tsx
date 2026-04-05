"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  PawPrint,
  Calendar,
  Phone,
  Mail,
  ExternalLink,
  X,
  Image as ImageIcon,
  Link2,
  FileText,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import type { Message } from "@/types/communications";

const COLORS = [
  "bg-rose-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
];

function avatarColor(name: string) {
  return COLORS[name.charCodeAt(0) % COLORS.length];
}

function initials(name: string) {
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
  const [mediaTab, setMediaTab] = useState<"media" | "links" | "docs">("media");

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
  const totalSpend = clientBookings.reduce((s, b) => s + b.totalCost, 0);

  if (!client) {
    return (
      <div className="flex h-full w-80 flex-col items-center justify-center border-l bg-white">
        <User className="size-10 text-slate-200" />
        <p className="mt-2 text-sm text-slate-400">Select a conversation</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
          Details
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 rounded-full"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile */}
        <div className="flex flex-col items-center px-4 pt-6 pb-4">
          {(client as Record<string, unknown>)?.imageUrl ? (
            <img
              src={(client as Record<string, unknown>).imageUrl as string}
              alt=""
              className="size-20 rounded-full object-cover ring-4 ring-slate-100"
            />
          ) : (
            <div
              className={cn(
                "flex size-20 items-center justify-center rounded-full text-2xl font-bold text-white",
                avatarColor(client.name),
              )}
            >
              {initials(client.name)}
            </div>
          )}
          <h3 className="mt-3 text-base font-bold text-slate-800">
            {client.name}
          </h3>
          <p className="text-xs text-slate-400">{client.email}</p>

          {/* Actions */}
          <div className="mt-4 flex gap-3">
            {[
              { icon: Phone, label: "Call", href: `tel:${client.phone}` },
              {
                icon: Mail,
                label: "Email",
                href: `mailto:${client.email}`,
              },
              {
                icon: Bell,
                label: "Notify",
                href: undefined,
              },
              {
                icon: ExternalLink,
                label: "Profile",
                href: `/facility/dashboard/clients/${client.id}`,
              },
            ].map((action) => (
              <div
                key={action.label}
                className="flex flex-col items-center gap-1"
              >
                {action.href ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                    asChild
                  >
                    {action.href.startsWith("/") ? (
                      <Link href={action.href}>
                        <action.icon className="size-4" />
                      </Link>
                    ) : (
                      <a href={action.href}>
                        <action.icon className="size-4" />
                      </a>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    <action.icon className="size-4" />
                  </Button>
                )}
                <span className="text-[9px] font-medium text-slate-400">
                  {action.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Stats */}
        <div className="grid grid-cols-3 px-4 py-4">
          {[
            { n: upcoming.length, label: "Upcoming" },
            { n: completed.length, label: "Completed" },
            {
              n: `$${totalSpend > 999 ? `${(totalSpend / 1000).toFixed(1)}k` : totalSpend}`,
              label: "Lifetime",
            },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-xl font-bold text-slate-800 tabular-nums">
                {s.n}
              </p>
              <p className="text-[9px] font-semibold tracking-wider text-slate-400 uppercase">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <Separator />

        {/* Pets */}
        <div className="px-4 py-3">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            <PawPrint className="size-3" />
            Pets
          </p>
          <div className="space-y-1.5">
            {client.pets.map((pet) => (
              <Link
                key={pet.id}
                href={`/facility/dashboard/clients/${client.id}/pets/${pet.id}`}
                className="flex items-center gap-2.5 rounded-xl p-2 transition-colors hover:bg-slate-50"
              >
                {pet.imageUrl ? (
                  <img
                    src={pet.imageUrl}
                    alt=""
                    className="size-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-9 items-center justify-center rounded-full bg-slate-100">
                    <PawPrint className="size-4 text-slate-400" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    {pet.name}
                  </p>
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
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            <Calendar className="size-3" />
            Next Appointment
          </p>
          {upcoming[0] ? (
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-slate-200 text-[10px] text-slate-700 capitalize">
                  {upcoming[0].service}
                </Badge>
                <span className="text-xs font-bold text-slate-700 tabular-nums">
                  ${upcoming[0].totalCost}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {new Date(upcoming[0].startDate).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
                {upcoming[0].checkInTime && ` · ${upcoming[0].checkInTime}`}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              No upcoming bookings
            </p>
          )}
        </div>

        <Separator />

        {/* Shared Media */}
        <div className="px-4 py-3">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            <ImageIcon className="size-3" />
            Shared Media
          </p>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
            {(
              [
                { key: "media" as const, label: "Media", icon: ImageIcon },
                { key: "links" as const, label: "Links", icon: Link2 },
                { key: "docs" as const, label: "Docs", icon: FileText },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setMediaTab(tab.key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[10px] font-semibold transition-all",
                  mediaTab === tab.key
                    ? "bg-white text-slate-700 shadow-sm"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                <tab.icon className="size-3" />
                {tab.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-col items-center py-6 text-center">
            {mediaTab === "media" && (
              <>
                <ImageIcon className="size-6 text-slate-200" />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  No media shared yet
                </p>
              </>
            )}
            {mediaTab === "links" && (
              <>
                <Link2 className="size-6 text-slate-200" />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  No links shared yet
                </p>
              </>
            )}
            {mediaTab === "docs" && (
              <>
                <FileText className="size-6 text-slate-200" />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  No documents shared yet
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
