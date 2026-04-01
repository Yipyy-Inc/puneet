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
} from "lucide-react";
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
      if (s) {
        const parsed = JSON.parse(s);
        requestAnimationFrame(() => setRecentCtx(parsed));
      }
    } catch {
      /* ignore */
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
  const otherBookings = useMemo(() => {
    return bookings
      .filter(
        (b) =>
          b.clientId === client.id &&
          String(b.id) !== currentBookingId,
      )
      .sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      )
      .slice(0, 3);
  }, [client.id, currentBookingId]);

  // Nav sections
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
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
          active
            ? "bg-muted font-medium text-foreground"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        )}
      >
        <Icon className={cn("size-4 shrink-0", active && "text-foreground")} />
        <span className="flex-1">{item.label}</span>
        {item.count != null && item.count > 0 && (
          <span
            className={cn(
              "min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-xs",
              active
                ? "bg-foreground/10 font-medium"
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
    <aside className="bg-card hidden w-64 shrink-0 border-r border-border/50 lg:flex lg:flex-col">
      {/* Back link */}
      <div className="px-4 py-3">
        <Link
          href="/facility/dashboard/clients"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
        >
          <ChevronLeft className="size-3.5" />
          All Clients
        </Link>
      </div>

      {/* Client header */}
      <div className="px-4 pb-4">
        <div className="flex flex-col items-center text-center">
          <div className="bg-muted text-muted-foreground flex size-16 items-center justify-center rounded-full text-lg font-semibold">
            {getInitials(client.name)}
          </div>
          <h3 className="mt-3 text-base font-semibold">{client.name}</h3>
          <div className="mt-1 flex items-center gap-1.5">
            <div
              className={cn(
                "size-2 rounded-full",
                client.status === "active"
                  ? "bg-emerald-500"
                  : "bg-muted-foreground",
              )}
            />
            <span className="text-muted-foreground text-xs capitalize">
              {client.status}
            </span>
            {client.membership?.status === "active" && (
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 px-1.5 text-[10px] text-amber-700"
              >
                {client.membership.plan}
              </Badge>
            )}
          </div>
        </div>

        {/* Contact */}
        <div className="mt-3 space-y-1.5">
          {client.email && (
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <Mail className="size-3.5 shrink-0" />
              <span className="truncate">{client.email}</span>
            </p>
          )}
          {client.phone && (
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <Phone className="size-3.5 shrink-0" />
              {client.phone}
            </p>
          )}
        </div>

        {/* Quick actions */}
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 flex-1 text-xs"
            asChild
          >
            <Link href={`${base}/messages`}>
              <Mail className="mr-1.5 size-3.5" />
              Message
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 flex-1 text-xs"
            asChild
          >
            <Link href={`/facility/dashboard/clients/${client.id}`}>
              <User className="mr-1.5 size-3.5" />
              Profile
            </Link>
          </Button>
        </div>
      </div>

      <div className="border-t border-border/50" />

      {/* Recent context */}
      {showRecentSection && (
        <div className="space-y-1 px-3 pt-3 pb-2">
          {hasRecentBooking && (
            <Link
              href={recentCtx.booking!.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-all",
                onBookingDetail
                  ? "bg-muted border-border font-medium"
                  : "border-border/50 hover:bg-muted/50",
              )}
            >
              <Calendar
                className={cn(
                  "size-4 shrink-0",
                  onBookingDetail
                    ? "text-foreground"
                    : "text-muted-foreground",
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
                "flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-all",
                onPetDetail
                  ? "bg-muted border-border font-medium"
                  : "border-border/50 hover:bg-muted/50",
              )}
            >
              <PawPrint
                className={cn(
                  "size-4 shrink-0",
                  onPetDetail
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              />
              <span className="flex-1 text-sm">
                Pet #{recentCtx.pet!.id}
              </span>
              {!onPetDetail && (
                <ArrowUpRight className="text-muted-foreground size-3.5" />
              )}
            </Link>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
        {/* Customer */}
        <p className="text-muted-foreground mb-1 px-3 text-[11px] font-medium uppercase tracking-wider">
          Customer
        </p>
        <div className="space-y-0.5">
          {customerNav.map(renderNavItem)}
        </div>

        {/* Communication */}
        <p className="text-muted-foreground mb-1 mt-4 px-3 text-[11px] font-medium uppercase tracking-wider">
          Communication
        </p>
        <div className="space-y-0.5">
          {communicationNav.map(renderNavItem)}
        </div>

        {/* Admin */}
        <p className="text-muted-foreground mb-1 mt-4 px-3 text-[11px] font-medium uppercase tracking-wider">
          Admin
        </p>
        <div className="space-y-0.5">
          {adminNav.map(renderNavItem)}
        </div>

        {/* Other bookings — contextual */}
        {onBookingDetail && otherBookings.length > 0 && (
          <>
            <p className="text-muted-foreground mb-1 mt-4 px-3 text-[11px] font-medium uppercase tracking-wider">
              Other Bookings
            </p>
            <div className="space-y-0.5">
              {otherBookings.map((b) => {
                const bPet = client.pets.find(
                  (p) =>
                    p.id ===
                    (Array.isArray(b.petId) ? b.petId[0] : b.petId),
                );
                return (
                  <Link
                    key={b.id}
                    href={`${base}/bookings/${b.id}`}
                    className="text-muted-foreground hover:bg-muted/50 hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all"
                  >
                    <Calendar className="size-4 shrink-0 opacity-60" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        #{b.id} · {b.service}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        {formatDateShort(b.startDate)}
                        {bPet && ` · ${bPet.name}`}
                      </p>
                    </div>
                    <span className="text-xs font-medium">${b.totalCost}</span>
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
