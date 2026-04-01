"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  MessageSquare,
  ExternalLink,
  Phone,
  Mail,
  Crown,
  CircleCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Client } from "@/types/client";
import { cn } from "@/lib/utils";

interface ClientInfoStripProps {
  client: Client;
  backHref: string;
  currentContext?: string;
}

export function ClientInfoStrip({
  client,
  backHref,
  currentContext,
}: ClientInfoStripProps) {
  const hasMembership =
    client.membership?.status === "active" && client.membership.plan;
  const isActive = client.status === "active";
  const initials = client.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="border-b">
      {/* Top bar — back nav + context */}
      <div className="bg-muted/40 flex items-center justify-between px-6 py-2">
        <Link
          href={backHref}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to client profile
        </Link>
        {currentContext && (
          <span className="text-muted-foreground/70 text-xs">
            {currentContext}
          </span>
        )}
      </div>

      {/* Client card */}
      <div className="flex items-center gap-5 px-6 py-4">
        {/* Avatar with status ring */}
        <div className="relative">
          {client.imageUrl ? (
            <Image
              src={client.imageUrl}
              alt={client.name}
              width={56}
              height={56}
              className={cn(
                "size-14 rounded-full object-cover shadow-md ring-[3px]",
                isActive ? "ring-emerald-400" : "ring-muted-foreground/30",
              )}
            />
          ) : (
            <div
              className={cn(
                "bg-primary/10 text-primary flex size-14 items-center justify-center rounded-full text-lg font-bold shadow-md ring-[3px]",
                isActive ? "ring-emerald-400" : "ring-muted-foreground/30",
              )}
            >
              {initials}
            </div>
          )}
          {/* Status dot */}
          <div
            className={cn(
              "absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full border-2 border-white",
              isActive ? "bg-emerald-500" : "bg-muted-foreground/40",
            )}
          >
            <CircleCheck className="size-3 text-white" />
          </div>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          {/* Name row */}
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-bold tracking-tight">
              {client.name}
            </h2>
            {hasMembership && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                <Crown className="size-3" />
                {client.membership!.plan}
              </span>
            )}
          </div>

          {/* Contact row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1">
            {client.email && (
              <a
                href={`mailto:${client.email}`}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
              >
                <Mail className="size-3.5" />
                {client.email}
              </a>
            )}
            {client.phone && (
              <a
                href={`tel:${client.phone}`}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
              >
                <Phone className="size-3.5" />
                {client.phone}
              </a>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-lg shadow-sm"
          >
            <MessageSquare className="size-4" />
            <span className="hidden sm:inline">Message</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-9 gap-1.5 rounded-lg shadow-sm"
            asChild
          >
            <Link href={backHref}>
              <ExternalLink className="size-3.5" />
              <span className="hidden sm:inline">Full Profile</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
