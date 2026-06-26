"use client";

import {
  Blocks,
  Building2,
  Calendar,
  Eye,
  EyeOff,
  HardDrive,
  MapPin,
  Pencil,
  Percent,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { modules } from "@/data/modules";
import { cn } from "@/lib/utils";
import type { TierWithUsage } from "@/types/commercial-tiers";
import { TIER_ACCENT, formatLimit } from "./tier-utils";

interface TierCardProps {
  tier: TierWithUsage;
  onEdit: (tier: TierWithUsage) => void;
}

export function TierCard({ tier, onEdit }: TierCardProps) {
  const accent = TIER_ACCENT[tier.type];
  const isPublic = tier.isPublic ?? true;
  const moduleCount = tier.availableModules.length;

  return (
    <Card className="relative flex flex-col gap-0 overflow-hidden p-0">
      <div className={cn("h-1 w-full", accent.bar)} />
      <div className="flex flex-col gap-4 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-lg font-semibold tracking-tight">
                {tier.name || "Untitled tier"}
              </h3>
              <Badge
                variant="outline"
                className={cn("capitalize", accent.badge)}
              >
                {tier.type}
              </Badge>
            </div>
            <p className="text-muted-foreground line-clamp-2 text-sm">
              {tier.description || "No description"}
            </p>
          </div>
          <Badge variant={tier.isActive ? "default" : "secondary"}>
            {tier.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>

        {/* Price */}
        <div className="flex items-end justify-between border-y py-3">
          <div>
            <span className="text-3xl font-bold tracking-tight tabular-nums">
              ${tier.pricing.monthly}
            </span>
            <span className="text-muted-foreground text-sm"> / month</span>
            <p className="text-muted-foreground text-xs">
              ${tier.pricing.yearly.toLocaleString()} billed yearly
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            {isPublic ? (
              <Eye className="text-muted-foreground size-3.5" />
            ) : (
              <EyeOff className="text-muted-foreground size-3.5" />
            )}
            <span className="text-muted-foreground text-xs">
              {isPublic ? "Public" : "Hidden"}
            </span>
          </div>
        </div>

        {/* Limits */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <LimitRow
            icon={Users}
            label="Staff"
            value={formatLimit(tier.limitations.maxUsers)}
          />
          <LimitRow
            icon={Building2}
            label="Clients"
            value={formatLimit(tier.limitations.maxClients)}
          />
          <LimitRow
            icon={MapPin}
            label="Locations"
            value={formatLimit(tier.limitations.maxLocations)}
          />
          <LimitRow
            icon={Calendar}
            label="Bookings/mo"
            value={formatLimit(tier.limitations.maxReservations)}
          />
          <LimitRow
            icon={HardDrive}
            label="Storage"
            value={formatLimit(tier.limitations.storageGB, " GB")}
          />
          <LimitRow
            icon={Percent}
            label="Txn fee"
            value={`${tier.transactionFeePercent ?? 0}%`}
          />
        </div>

        {/* Modules + facilities */}
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1.5">
            <Blocks className="size-3.5" />
            {moduleCount} modules
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="size-3.5" />
            {tier.facilityCount} facilities
          </span>
        </div>

        {/* Modules preview */}
        <div className="flex flex-wrap gap-1">
          {tier.availableModules.slice(0, 4).map((moduleId) => {
            const mod = modules.find((m) => m.id === moduleId);
            return mod ? (
              <Badge key={moduleId} variant="secondary" className="text-xs">
                {mod.name}
              </Badge>
            ) : null;
          })}
          {moduleCount > 4 && (
            <Badge variant="outline" className="text-xs">
              +{moduleCount - 4} more
            </Badge>
          )}
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => onEdit(tier)}
        >
          <Pencil className="mr-2 size-4" />
          Edit
        </Button>
      </div>
    </Card>
  );
}

function LimitRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-muted/40 flex items-center gap-2 rounded-lg px-2.5 py-1.5">
      <Icon className="text-muted-foreground size-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-muted-foreground text-[11px] leading-none">
          {label}
        </p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
