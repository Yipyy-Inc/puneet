"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  PawPrint,
  Calendar,
  DollarSign,
  Syringe,
  FileText,
  MessageSquare,
  Award,
  FolderOpen,
  Phone,
  Mail,
  Tags,
  History,
  ChevronLeft,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { bookings } from "@/data/bookings";
import type { Client } from "@/types/client";

interface ClientFileSidebarProps {
  client: Client;
  petCount: number;
  bookingCount: number;
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

function formatDateShort(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ClientFileSidebar({
  client,
  petCount,
  bookingCount,
}: ClientFileSidebarProps) {
  const pathname = usePathname();
  const base = `/facility/dashboard/clients/${client.id}`;
  const onBookingDetail = !!pathname.match(/\/clients\/\d+\/bookings\/(\d+)/);
  const onPetDetail = !!pathname.match(/\/clients\/\d+\/pets\/(\d+)/);
  const currentBookingId = pathname.match(/\/bookings\/(\d+)/)?.[1];

  const isActive = (path: string, matchPrefix?: string) => {
    if (matchPrefix && (onBookingDetail || onPetDetail)) {
      return pathname === path;
    }
    if (matchPrefix) return pathname.startsWith(matchPrefix);
    return pathname.startsWith(path);
  };

  // Persist last-viewed booking/pet
  const storageKey = `yipyy_client_${client.id}_ctx`;
  const [recentCtx, setRecentCtx] = useState<{
    booking: { id: string; href: string } | null;
    pet: { id: string; href: string } | null;
  }>({ booking: null, pet: null });

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(storageKey);
      if (s) requestAnimationFrame(() => setRecentCtx(JSON.parse(s)));
    } catch {
      /* */
    }
  }, [storageKey]);

  useEffect(() => {
    const bm = pathname.match(/\/clients\/\d+\/bookings\/(\d+)/);
    const pm = pathname.match(/\/clients\/\d+\/pets\/(\d+)/);
    if (!bm && !pm) return;
    requestAnimationFrame(() => {
      setRecentCtx((prev) => {
        const next = {
          booking: bm ? { id: bm[1], href: pathname } : prev.booking,
          pet: pm ? { id: pm[1], href: pathname } : prev.pet,
        };
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* */
        }
        return next;
      });
    });
  }, [pathname, storageKey]);

  const hasRecentBooking = !!recentCtx.booking;
  const hasRecentPet = !!recentCtx.pet;
  const showRecentSection = hasRecentBooking || hasRecentPet;

  // Other bookings for context
  const otherBookings = useMemo(
    () =>
      bookings
        .filter(
          (b) => b.clientId === client.id && String(b.id) !== currentBookingId,
        )
        .sort(
          (a, b) =>
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
        )
        .slice(0, 3),
    [client.id, currentBookingId],
  );

  // Nav config
  const customerNav = [
    { href: `${base}/overview`, label: "Overview", icon: User },
    {
      href: `${base}/pets`,
      label: "Pet Profiles",
      count: petCount,
      icon: PawPrint,
      matchPrefix: `${base}/pets`,
    },
    {
      href: `${base}/bookings`,
      label: "Booking History",
      count: bookingCount,
      icon: Calendar,
      matchPrefix: `${base}/bookings`,
    },
    {
      href: `${base}/billing`,
      label: "Billing & Payments",
      icon: DollarSign,
    },
    { href: `${base}/vaccinations`, label: "Vaccinations", icon: Syringe },
    { href: `${base}/forms`, label: "Forms & Waivers", icon: FileText },
  ];

  const communicationNav = [
    { href: `${base}/messages`, label: "Messages", icon: MessageSquare },
    { href: `${base}/report-cards`, label: "Report Cards", icon: Award },
    { href: `${base}/documents`, label: "Documents", icon: FolderOpen },
  ];

  const adminNav = [
    { href: `${base}/tags`, label: "Tags & Notes", icon: Tags },
    { href: `${base}/audit`, label: "Audit Trail", icon: History },
  ];

  const renderNavItem = (item: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    matchPrefix?: string;
  }) => {
    const Icon = item.icon;
    const active = isActive(item.href, item.matchPrefix);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
          active
            ? "bg-primary/10 text-primary font-medium"
            : "text-foreground/70 hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon
          className={cn(
            "size-4 shrink-0",
            active ? "text-primary" : "text-foreground/40",
          )}
        />
        <span className="flex-1">{item.label}</span>
        {item.count != null && item.count > 0 && (
          <span
            className={cn(
              "min-w-[22px] rounded-md px-1.5 py-0.5 text-center text-xs font-medium",
              active
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {item.count}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="border-border/40 bg-background hidden w-80 shrink-0 border-r lg:flex lg:flex-col">
      {/* Back */}
      <div className="px-5 pt-4 pb-2">
        <Link
          href="/facility/dashboard/clients"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
        >
          <ChevronLeft className="size-3.5" />
          All Clients
        </Link>
      </div>

      {/* Client header */}
      <div className="px-5 pb-5">
        <div className="flex flex-col items-center text-center">
          {client.imageUrl ? (
            <div className="ring-border/50 ring-offset-background size-[72px] overflow-hidden rounded-full ring-2 ring-offset-2">
              <Image
                src={client.imageUrl}
                alt={client.name}
                width={72}
                height={72}
                className="size-full object-cover"
              />
            </div>
          ) : (
            <div className="bg-primary/10 text-primary ring-border/50 ring-offset-background flex size-[72px] items-center justify-center rounded-full text-xl font-bold ring-2 ring-offset-2">
              {getInitials(client.name)}
            </div>
          )}
          <h3 className="mt-3 text-lg font-semibold tracking-tight">
            {client.name}
          </h3>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge
              variant={client.status === "active" ? "default" : "secondary"}
              className="h-5 px-2 text-[10px] capitalize"
            >
              {client.status}
            </Badge>
            {client.membership?.status === "active" && (
              <Badge
                variant="outline"
                className="h-5 border-amber-300 bg-amber-50 px-2 text-[10px] font-medium text-amber-700"
              >
                {client.membership.plan}
              </Badge>
            )}
          </div>
        </div>

        {/* Contact */}
        <div className="border-border/40 bg-muted/30 mt-4 space-y-2 rounded-lg border p-3">
          {client.email && (
            <div className="flex items-center gap-2.5 text-sm">
              <Mail className="text-muted-foreground size-4 shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2.5 text-sm">
              <Phone className="text-muted-foreground size-4 shrink-0" />
              {client.phone}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" className="h-9 flex-1" asChild>
            <Link href={`${base}/messages`}>
              <MessageSquare className="mr-1.5 size-4" />
              Message
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-9 flex-1" asChild>
            <Link href={`/facility/dashboard/clients/${client.id}`}>
              <ExternalLink className="mr-1.5 size-4" />
              Full Profile
            </Link>
          </Button>
        </div>
      </div>

      {/* Recent context */}
      {showRecentSection && (
        <div className="border-border/40 space-y-1.5 border-t px-4 pt-4 pb-3">
          <p className="text-muted-foreground mb-2 px-1 text-[11px] font-medium tracking-wider uppercase">
            Currently Viewing
          </p>
          {hasRecentBooking && (
            <Link
              href={recentCtx.booking!.href}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-all",
                onBookingDetail
                  ? "border-primary/30 bg-primary/5 font-medium"
                  : "border-border/40 hover:border-border hover:bg-muted/50",
              )}
            >
              <Calendar
                className={cn(
                  "size-4 shrink-0",
                  onBookingDetail ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span className="flex-1 text-sm">
                Booking #{recentCtx.booking!.id}
              </span>
              {!onBookingDetail && (
                <ArrowUpRight className="text-muted-foreground size-3.5" />
              )}
            </Link>
          )}
          {hasRecentPet && (
            <Link
              href={recentCtx.pet!.href}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-all",
                onPetDetail
                  ? "border-primary/30 bg-primary/5 font-medium"
                  : "border-border/40 hover:border-border hover:bg-muted/50",
              )}
            >
              <PawPrint
                className={cn(
                  "size-4 shrink-0",
                  onPetDetail ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span className="flex-1 text-sm">Pet #{recentCtx.pet!.id}</span>
              {!onPetDetail && (
                <ArrowUpRight className="text-muted-foreground size-3.5" />
              )}
            </Link>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="border-border/40 flex-1 overflow-y-auto border-t px-4 pt-4 pb-5">
        <p className="text-muted-foreground mb-1.5 px-3 text-[11px] font-medium tracking-wider uppercase">
          Customer
        </p>
        <div className="space-y-0.5">{customerNav.map(renderNavItem)}</div>

        <p className="text-muted-foreground mt-5 mb-1.5 px-3 text-[11px] font-medium tracking-wider uppercase">
          Communication
        </p>
        <div className="space-y-0.5">{communicationNav.map(renderNavItem)}</div>

        <p className="text-muted-foreground mt-5 mb-1.5 px-3 text-[11px] font-medium tracking-wider uppercase">
          Admin
        </p>
        <div className="space-y-0.5">{adminNav.map(renderNavItem)}</div>

        {/* Other bookings — contextual */}
        {onBookingDetail && otherBookings.length > 0 && (
          <>
            <p className="text-muted-foreground mt-5 mb-1.5 px-3 text-[11px] font-medium tracking-wider uppercase">
              Other Bookings
            </p>
            <div className="space-y-1">
              {otherBookings.map((b) => {
                const bPet = client.pets.find(
                  (p) =>
                    p.id === (Array.isArray(b.petId) ? b.petId[0] : b.petId),
                );
                return (
                  <Link
                    key={b.id}
                    href={`${base}/bookings/${b.id}`}
                    className="text-foreground/70 hover:bg-muted hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all"
                  >
                    <Calendar className="text-foreground/30 size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium capitalize">
                        #{b.id} · {b.service}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatDateShort(b.startDate)}
                        {bPet && ` · ${bPet.name}`}
                      </p>
                    </div>
                    <span className="font-[tabular-nums] text-sm font-medium">
                      ${b.totalCost}
                    </span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </nav>
    </aside>
  );
}
