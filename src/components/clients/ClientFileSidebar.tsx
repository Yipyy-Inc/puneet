"use client";

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

  const isActive = (path: string) => {
    if (path === base) return pathname === base;
    return pathname.startsWith(path);
  };

  const navItems = [
    { href: base, label: "Overview", icon: User },
    {
      href: `${base}/pets`,
      label: `Pets (${petCount})`,
      icon: PawPrint,
      matchPrefix: `${base}/pets`,
    },
    {
      href: `${base}/bookings`,
      label: `Bookings (${bookingCount})`,
      icon: Calendar,
      matchPrefix: `${base}/bookings`,
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
    <aside className="bg-card hidden w-60 shrink-0 border-r lg:block">
      <div className="sticky top-0 max-h-screen overflow-y-auto">
        {/* Client header */}
        <div className="border-b p-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
              {getInitials(client.name)}
            </div>
            <div className="min-w-0">
              <Link
                href={base}
                className="hover:text-primary truncate text-sm font-semibold transition-colors"
              >
                {client.name}
              </Link>
              <Badge
                variant={client.status === "active" ? "default" : "secondary"}
                className="mt-0.5 text-[9px] capitalize"
              >
                {client.status}
              </Badge>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            {client.email && (
              <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                <Mail className="size-3" />
                <span className="truncate">{client.email}</span>
              </div>
            )}
            {client.phone && (
              <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                <Phone className="size-3" />
                {client.phone}
              </div>
            )}
          </div>
          {client.membership?.status === "active" && (
            <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">
              {client.membership.plan} Member
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-2">
          <p className="text-muted-foreground px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wider uppercase">
            Client File
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.matchPrefix
              ? pathname.startsWith(item.matchPrefix)
              : isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {item.label}
              </Link>
            );
          })}

          <div className="my-2 border-t" />

          <p className="text-muted-foreground px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wider uppercase">
            Admin
          </p>
          {adminItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
