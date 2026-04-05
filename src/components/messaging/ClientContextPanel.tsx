"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Image as ImageIcon,
  Link2,
  FileText,
  Eye,
  PawPrint,
  Calendar,
  Phone,
  Mail,
  ExternalLink,
  Send,
  ChevronDown,
  ChevronUp,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import type { Message } from "@/types/communications";

// ── Quick-send links (staff can send these into chat) ────────────────

const QUICK_LINKS = [
  {
    id: "ql-1",
    label: "Boarding Agreement",
    url: "https://pawcare.com/forms/boarding-agreement",
    icon: FileText,
    color: "bg-blue-50 text-blue-600",
  },
  {
    id: "ql-2",
    label: "Vaccination Form",
    url: "https://pawcare.com/forms/vaccination-upload",
    icon: FileText,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    id: "ql-3",
    label: "Intake Form",
    url: "https://pawcare.com/forms/intake",
    icon: FileText,
    color: "bg-violet-50 text-violet-600",
  },
  {
    id: "ql-4",
    label: "Pricing & Packages",
    url: "https://pawcare.com/pricing",
    icon: Link2,
    color: "bg-amber-50 text-amber-600",
  },
  {
    id: "ql-5",
    label: "Facility Policies",
    url: "https://pawcare.com/policies",
    icon: Link2,
    color: "bg-slate-100 text-slate-600",
  },
];

// ── Demo shared media ────────────────────────────────────────────────

interface SharedMedia {
  id: string;
  type: "image" | "link" | "document";
  url: string;
  name: string;
  date: string;
  sender: string;
  thumbnail?: string;
  size?: string;
}

const DEMO_MEDIA: SharedMedia[] = [
  {
    id: "d1",
    type: "image",
    url: "/dogs/dog-1.jpg",
    name: "buddy.jpg",
    date: "2026-04-03T14:30:00Z",
    sender: "You",
    thumbnail: "/dogs/dog-1.jpg",
  },
  {
    id: "d2",
    type: "image",
    url: "/dogs/dog-2.jpg",
    name: "max.jpg",
    date: "2026-04-02T11:00:00Z",
    sender: "Client",
    thumbnail: "/dogs/dog-2.jpg",
  },
  {
    id: "d3",
    type: "image",
    url: "/dogs/dog-3.jpg",
    name: "eval.jpg",
    date: "2026-04-01T09:30:00Z",
    sender: "You",
    thumbnail: "/dogs/dog-3.jpg",
  },
  {
    id: "d4",
    type: "image",
    url: "/dogs/dog-4.jpg",
    name: "daycare.jpg",
    date: "2026-03-30T15:00:00Z",
    sender: "You",
    thumbnail: "/dogs/dog-4.jpg",
  },
  {
    id: "d5",
    type: "image",
    url: "/cats/cat-1.jpg",
    name: "whiskers.jpg",
    date: "2026-03-28T10:00:00Z",
    sender: "Client",
    thumbnail: "/cats/cat-1.jpg",
  },
  {
    id: "d6",
    type: "image",
    url: "/cats/cat-2.jpg",
    name: "luna.jpg",
    date: "2026-03-25T16:00:00Z",
    sender: "You",
    thumbnail: "/cats/cat-2.jpg",
  },
];

const AVATAR_COLORS = [
  "bg-rose-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-sky-500",
];

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ── Collapsible section ──────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: typeof PawPrint;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-2 hover:bg-slate-50"
      >
        <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
          <Icon className="size-3" />
          {title}
        </span>
        {open ? (
          <ChevronUp className="size-3 text-slate-300" />
        ) : (
          <ChevronDown className="size-3 text-slate-300" />
        )}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

export function ClientContextPanel({
  threadId,
  messages,
  onClose,
}: {
  threadId: string | null;
  messages: Message[];
  onClose: () => void;
}) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
      <div className="flex h-full w-72 shrink-0 flex-col items-center justify-center bg-white">
        <p className="text-sm text-slate-400">Select a conversation</p>
      </div>
    );
  }

  const clientImage = (client as Record<string, unknown>)?.imageUrl as
    | string
    | undefined;

  return (
    <div className="flex h-full w-72 shrink-0 flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          Client Info
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 rounded-full text-slate-400"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Client profile ── */}
        <div className="flex flex-col items-center border-b px-4 pt-5 pb-4">
          {clientImage ? (
            <img
              src={clientImage}
              alt=""
              className="size-16 rounded-full object-cover ring-4 ring-slate-100"
            />
          ) : (
            <div
              className={cn(
                "flex size-16 items-center justify-center rounded-full text-xl font-bold text-white",
                avatarColor(client.name),
              )}
            >
              {initials(client.name)}
            </div>
          )}
          <h3 className="mt-2 text-sm font-bold text-slate-800">
            {client.name}
          </h3>

          {/* Contact row */}
          <div className="mt-2 flex items-center gap-4 text-[10px] text-slate-400">
            {client.phone && (
              <a
                href={`tel:${client.phone}`}
                className="flex items-center gap-1 hover:text-slate-600"
              >
                <Phone className="size-3" />
                {client.phone}
              </a>
            )}
            <a
              href={`mailto:${client.email}`}
              className="flex items-center gap-1 hover:text-slate-600"
            >
              <Mail className="size-3" />
              Email
            </a>
          </div>

          {/* Quick actions */}
          <div className="mt-3 flex gap-2">
            <Link href={`/facility/dashboard/clients/${client.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 rounded-full text-[10px]"
              >
                <ExternalLink className="size-3" />
                View Profile
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 border-b py-3">
          {[
            { n: upcoming.length, label: "Upcoming" },
            { n: completed.length, label: "Past" },
            {
              n: `$${totalSpend > 999 ? `${(totalSpend / 1000).toFixed(1)}k` : totalSpend}`,
              label: "Spent",
            },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-base font-bold text-slate-800 tabular-nums">
                {s.n}
              </p>
              <p className="text-[8px] font-semibold tracking-wider text-slate-400 uppercase">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Pets ── */}
        <Section title="Pets" icon={PawPrint}>
          <div className="space-y-1">
            {client.pets.map((pet) => (
              <Link
                key={pet.id}
                href={`/facility/dashboard/clients/${client.id}/pets/${pet.id}`}
                className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-50"
              >
                {pet.imageUrl ? (
                  <img
                    src={pet.imageUrl}
                    alt=""
                    className="size-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-8 items-center justify-center rounded-full bg-slate-100">
                    <PawPrint className="size-3.5 text-slate-400" />
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-semibold text-slate-700">
                    {pet.name}
                  </p>
                  <p className="text-[9px] text-slate-400">
                    {pet.breed} · {pet.type}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Section>

        {/* ── Next Appointment ── */}
        <Section title="Next Appointment" icon={Calendar}>
          {upcoming[0] ? (
            <div className="rounded-xl bg-slate-50 p-2.5">
              <div className="flex items-center justify-between">
                <Badge className="bg-blue-100 text-[9px] text-blue-700 capitalize">
                  {upcoming[0].service}
                </Badge>
                <span className="text-[11px] font-bold text-slate-700 tabular-nums">
                  ${upcoming[0].totalCost}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-slate-500">
                {formatDate(upcoming[0].startDate)}
                {upcoming[0].checkInTime && ` · ${upcoming[0].checkInTime}`}
              </p>
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 italic">
              No upcoming bookings
            </p>
          )}
        </Section>

        {/* ── Quick Send Links ── */}
        <Section title="Quick Send" icon={Send} defaultOpen>
          <div className="space-y-1">
            {QUICK_LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(link.url);
                  toast.success(`"${link.label}" link copied — paste in chat`);
                }}
                className="group flex w-full items-center gap-2 rounded-lg p-1.5 text-left transition-colors hover:bg-slate-50"
              >
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg",
                    link.color,
                  )}
                >
                  <link.icon className="size-3.5" />
                </div>
                <span className="flex-1 text-[10px] font-medium text-slate-600">
                  {link.label}
                </span>
                <Copy className="size-3 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </Section>

        {/* ── Shared Photos ── */}
        <Section title="Shared Photos" icon={ImageIcon} defaultOpen={false}>
          <div className="grid grid-cols-3 gap-[2px] overflow-hidden rounded-lg">
            {DEMO_MEDIA.map((item) => (
              <button
                key={item.id}
                className="group relative aspect-square overflow-hidden bg-slate-100"
                onClick={() => setSelectedImage(item.url)}
              >
                <img
                  src={item.thumbnail ?? item.url}
                  alt=""
                  className="size-full object-cover transition-transform group-hover:scale-110"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                  <Eye className="size-4 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </button>
            ))}
          </div>
        </Section>
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setSelectedImage(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 size-10 rounded-full text-white hover:bg-white/20"
            onClick={() => setSelectedImage(null)}
          >
            <X className="size-5" />
          </Button>
          <img
            src={selectedImage}
            alt=""
            className="max-h-[80vh] max-w-[80vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
