"use client";

import { useState, useEffect } from "react";
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
  Pencil,
  Tags,
  History,
  ChevronLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
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

export function ClientFileSidebar({
  client,
  petCount,
  bookingCount,
}: ClientFileSidebarProps) {
  const pathname = usePathname();
  const base = `/facility/dashboard/clients/${client.id}`;

  const isActive = (path: string) => {
    if (path === base) return pathname === base;
    return pathname.startsWith(path);
  };

  // Detect and REMEMBER the last viewed booking/pet within this client
  const [lastVisited, setLastVisited] = useState<{
    booking: { id: string; href: string } | null;
    pet: { id: string; href: string } | null;
  }>({ booking: null, pet: null });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const bMatch = pathname.match(/\/clients\/\d+\/bookings\/(\d+)/);
    const pMatch = pathname.match(/\/clients\/\d+\/pets\/(\d+)/);
    if (bMatch || pMatch) {
      // Use requestAnimationFrame to avoid synchronous setState in effect
      requestAnimationFrame(() => {
        setLastVisited((prev) => ({
          booking: bMatch ? { id: bMatch[1], href: pathname } : prev.booking,
          pet: pMatch ? { id: pMatch[1], href: pathname } : prev.pet,
        }));
      });
    }
  }, [pathname]);

  const currentBookingMatch = pathname.match(
    /\/clients\/\d+\/bookings\/(\d+)/,
  );
  const currentPetMatch = pathname.match(/\/clients\/\d+\/pets\/(\d+)/);

  // Use current match OR last remembered
  const activeBooking = currentBookingMatch
    ? { id: currentBookingMatch[1], href: pathname }
    : lastVisited.booking;
  const activePet = currentPetMatch
    ? { id: currentPetMatch[1], href: pathname }
    : lastVisited.pet;

  const navItems = [
    { href: base, label: "Overview", icon: User },
    {
      href: `${base}/pets`,
      label: "Pets",
      count: petCount,
      icon: PawPrint,
      matchPrefix: `${base}/pets`,
      subItem: activePet
        ? { href: activePet.href, label: `Pet #${activePet.id}` }
        : undefined,
    },
    {
      href: `${base}/bookings`,
      label: "Bookings",
      count: bookingCount,
      icon: Calendar,
      matchPrefix: `${base}/bookings`,
      subItem: activeBooking
        ? {
            href: activeBooking.href,
            label: `Booking #${activeBooking.id}`,
          }
        : undefined,
    },
    { href: `${base}/billing`, label: "Billing", icon: DollarSign },
    { href: `${base}/vaccinations`, label: "Vaccinations", icon: Syringe },
    { href: `${base}/forms`, label: "Forms", icon: FileText },
    { href: `${base}/messages`, label: "Messages", icon: MessageSquare },
    { href: `${base}/report-cards`, label: "Report Cards", icon: Award },
    { href: `${base}/documents`, label: "Documents", icon: FolderOpen },
  ];

  const adminItems = [
    { href: `${base}/edit`, label: "Edit Client", icon: Pencil },
    { href: `${base}/tags`, label: "Tags & Notes", icon: Tags },
    { href: `${base}/audit`, label: "Audit Trail", icon: History },
  ];

  return (
    <aside className="bg-card hidden w-64 shrink-0 border-r lg:flex lg:flex-col">
      {/* Back link */}
      <div className="border-b px-4 py-2.5">
        <Link
          href="/facility/dashboard/clients"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
        >
          <ChevronLeft className="size-3" />
          Back to Clients
        </Link>
      </div>

      {/* Client header */}
      <div className="border-b p-5">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm">
            {getInitials(client.name)}
          </div>
          <div className="min-w-0">
            <Link
              href={base}
              className="hover:text-primary block truncate text-sm font-semibold transition-colors"
            >
              {client.name}
            </Link>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Badge
                variant={client.status === "active" ? "default" : "secondary"}
                className="h-4 px-1.5 text-[9px] capitalize"
              >
                {client.status}
              </Badge>
              {client.membership?.status === "active" && (
                <Badge
                  variant="outline"
                  className="h-4 border-emerald-200 bg-emerald-50 px-1.5 text-[9px] text-emerald-700"
                >
                  {client.membership.plan}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="mt-3 space-y-1.5">
          {client.email && (
            <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
              <Mail className="size-3 shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          {client.phone && (
            <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
              <Phone className="size-3 shrink-0" />
              {client.phone}
            </div>
          )}
        </div>

        {/* Quick action — context-aware */}
        {pathname !== base ? (
          <Button
            size="sm"
            variant="outline"
            className="mt-3 h-8 w-full text-xs"
            asChild
          >
            <Link href={base}>View Full Profile</Link>
          </Button>
        ) : null}
      </div>

      {/* Scrollable navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <p className="text-muted-foreground px-3 pt-2 pb-1.5 text-[10px] font-semibold tracking-widest uppercase">
          Client File
        </p>
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.matchPrefix
              ? pathname.startsWith(item.matchPrefix)
              : isActive(item.href);
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
                    active
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Icon className={cn("size-4", active && "text-primary")} />
                  <span className="flex-1">{item.label}</span>
                  {item.count != null && item.count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        active
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </Link>
                {/* Sub-item: current booking/pet detail */}
                {item.subItem && (
                  <Link
                    href={item.subItem.href}
                    className="text-primary bg-primary/5 ml-6 mt-0.5 flex items-center gap-2 rounded-md border-l-2 border-primary/30 px-3 py-1.5 text-[12px] font-medium"
                  >
                    <span className="bg-primary size-1.5 rounded-full" />
                    {item.subItem.label}
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        <Separator className="my-3" />

        <p className="text-muted-foreground px-3 pt-1 pb-1.5 text-[10px] font-semibold tracking-widest uppercase">
          Admin
        </p>
        <div className="space-y-0.5">
          {adminItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
                  active
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className={cn("size-4", active && "text-primary")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
