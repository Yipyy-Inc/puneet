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
  ArrowUpRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  const onBookingDetail = !!pathname.match(/\/clients\/\d+\/bookings\/(\d+)/);
  const onPetDetail = !!pathname.match(/\/clients\/\d+\/pets\/(\d+)/);

  const isActive = (path: string, matchPrefix?: string) => {
    // On a detail page, don't highlight the parent section
    if (matchPrefix && (onBookingDetail || onPetDetail)) {
      return pathname === path;
    }
    if (matchPrefix) return pathname.startsWith(matchPrefix);
    if (path === base) return pathname === base;
    return pathname.startsWith(path);
  };

  // ── Persist last-viewed booking/pet via sessionStorage ──
  const storageKey = `yipyy_client_${client.id}_ctx`;

  const [recentCtx, setRecentCtx] = useState<{
    booking: { id: string; href: string } | null;
    pet: { id: string; href: string } | null;
  }>({ booking: null, pet: null });

  // Restore from sessionStorage after mount to avoid hydration mismatch
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

  // Always show the recent context card — it's the ONLY place the
  // specific booking/pet link lives. On the detail page itself it
  // serves as confirmation of what you're viewing; on other pages
  // it's the quick-return shortcut.
  const showRecentSection = hasRecentBooking || hasRecentPet;

  // ── Nav items ──
  const sections = [
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
    { href: `${base}/billing`, label: "Billing & Payments", icon: DollarSign },
    { href: `${base}/vaccinations`, label: "Vaccinations", icon: Syringe },
    { href: `${base}/forms`, label: "Forms & Waivers", icon: FileText },
    { href: `${base}/messages`, label: "Messages", icon: MessageSquare },
    { href: `${base}/report-cards`, label: "Report Cards", icon: Award },
    { href: `${base}/documents`, label: "Documents", icon: FolderOpen },
  ];

  const admin = [
    { href: `${base}/edit`, label: "Edit Client", icon: Pencil },
    { href: `${base}/tags`, label: "Tags & Notes", icon: Tags },
    { href: `${base}/audit`, label: "Audit Trail", icon: History },
  ];

  // ── Render ──
  return (
    <aside className="bg-card hidden w-64 shrink-0 border-r lg:flex lg:flex-col">
      {/* Back */}
      <div className="px-4 py-2.5">
        <Link
          href="/facility/dashboard/clients"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-[11px] font-medium transition-colors"
        >
          <ChevronLeft className="size-3" />
          All Clients
        </Link>
      </div>

      {/* Client card */}
      <div className="mx-3 mb-3 rounded-xl border bg-gradient-to-b from-muted/40 to-transparent p-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm">
            {getInitials(client.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{client.name}</p>
            <div className="mt-0.5 flex items-center gap-1">
              <div
                className={cn(
                  "size-1.5 rounded-full",
                  client.status === "active"
                    ? "bg-emerald-500"
                    : "bg-muted-foreground",
                )}
              />
              <span className="text-muted-foreground text-[10px] capitalize">
                {client.status}
              </span>
              {client.membership?.status === "active" && (
                <Badge
                  variant="outline"
                  className="ml-0.5 h-3.5 border-amber-200 bg-amber-50 px-1 text-[8px] text-amber-700"
                >
                  {client.membership.plan}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="mt-2.5 space-y-1">
          {client.email && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
              <Mail className="size-2.5 shrink-0" />
              <span className="truncate">{client.email}</span>
            </p>
          )}
          {client.phone && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
              <Phone className="size-2.5 shrink-0" />
              {client.phone}
            </p>
          )}
        </div>
      </div>

      {/* Recent context — pinned card for quick return */}
      {showRecentSection && (
        <div className="mx-3 mb-3 space-y-1">
          <p className="text-muted-foreground px-1 text-[9px] font-semibold tracking-widest uppercase">
            Continue where you left off
          </p>
          {hasRecentBooking && (
            <Link
              href={recentCtx.booking!.href}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 transition-all",
                onBookingDetail
                  ? "bg-primary/10 border-primary/30"
                  : "bg-primary/5 hover:bg-primary/10 border-primary/20",
              )}
            >
              <Calendar className="text-primary size-3.5 shrink-0" />
              <span className="text-primary flex-1 text-[12px] font-medium">
                Booking #{recentCtx.booking!.id}
              </span>
              {!onBookingDetail && (
                <ArrowUpRight className="text-primary/50 size-3" />
              )}
            </Link>
          )}
          {hasRecentPet && (
            <Link
              href={recentCtx.pet!.href}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 transition-all",
                onPetDetail
                  ? "bg-primary/10 border-primary/30"
                  : "bg-primary/5 hover:bg-primary/10 border-primary/20",
              )}
            >
              <PawPrint className="text-primary size-3.5 shrink-0" />
              <span className="text-primary flex-1 text-[12px] font-medium">
                Pet #{recentCtx.pet!.id}
              </span>
              {!onPetDetail && (
                <ArrowUpRight className="text-primary/50 size-3" />
              )}
            </Link>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        <p className="text-muted-foreground px-2 pt-1 pb-1.5 text-[9px] font-semibold tracking-widest uppercase">
          Sections
        </p>
        <div className="space-y-0.5">
          {sections.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.matchPrefix);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[12px] font-medium transition-all",
                  active
                    ? "bg-foreground/[0.06] text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "size-[15px]",
                    active ? "text-foreground" : "text-muted-foreground/70",
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {item.count != null && item.count > 0 && (
                  <span
                    className={cn(
                      "min-w-[18px] rounded-full px-1 py-px text-center text-[9px] font-semibold",
                      active
                        ? "bg-foreground/10 text-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="my-2.5 border-t" />

        <p className="text-muted-foreground px-2 pt-0.5 pb-1.5 text-[9px] font-semibold tracking-widest uppercase">
          Admin
        </p>
        <div className="space-y-0.5">
          {admin.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[12px] font-medium transition-all",
                  active
                    ? "bg-foreground/[0.06] text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "size-[15px]",
                    active ? "text-foreground" : "text-muted-foreground/70",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
