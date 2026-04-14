"use client";

import { cn } from "@/lib/utils";
import {
  Crown,
  ShieldCheck,
  ConciergeBell,
  Scissors,
  Award,
  PawPrint,
  Home,
  SprayCan,
  ShoppingBag,
  Truck,
  type LucideIcon,
} from "lucide-react";
import {
  ROLE_META,
  SERVICE_MODULE_META,
  ACCESS_SCOPE_META,
  type FacilityStaffRole,
  type ServiceModule,
  type AccessScope,
  type StaffProfile,
} from "@/types/facility-staff";

const ICON_MAP: Record<string, LucideIcon> = {
  Crown,
  ShieldCheck,
  ConciergeBell,
  Scissors,
  Award,
  PawPrint,
  Home,
  SprayCan,
  ShoppingBag,
  Truck,
};

export function RoleIcon({
  role,
  className,
}: {
  role: FacilityStaffRole;
  className?: string;
}) {
  const Icon = ICON_MAP[ROLE_META[role].icon] ?? ShieldCheck;
  return <Icon className={className} />;
}

export function ServiceIcon({
  module,
  className,
}: {
  module: ServiceModule;
  className?: string;
}) {
  const Icon = ICON_MAP[SERVICE_MODULE_META[module].icon] ?? Scissors;
  return <Icon className={className} />;
}

export function initialsOf(
  profile: Pick<StaffProfile, "firstName" | "lastName">,
) {
  return `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase();
}

export function fullNameOf(
  profile: Pick<StaffProfile, "firstName" | "lastName">,
) {
  return `${profile.firstName} ${profile.lastName}`;
}

export function StaffAvatar({
  profile,
  size = "md",
  ring = true,
}: {
  profile: StaffProfile;
  size?: "sm" | "md" | "lg" | "xl";
  ring?: boolean;
}) {
  const sizeClass =
    size === "sm"
      ? "size-8 text-xs"
      : size === "md"
        ? "size-11 text-sm"
        : size === "lg"
          ? "size-14 text-base"
          : "size-20 text-xl";

  const dotClass =
    size === "xl" ? "size-3.5 border-[3px]" : "size-2.5 border-2";

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-visible rounded-full font-semibold text-white shadow-sm",
        sizeClass,
        ring && "ring-background ring-2",
      )}
      style={{
        background: profile.avatarUrl ? undefined : profile.colorHex,
        boxShadow: `0 0 0 1px ${profile.colorHex}33`,
      }}
    >
      {profile.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatarUrl}
          alt={`${profile.firstName} ${profile.lastName}`}
          className="size-full rounded-full object-cover"
        />
      ) : (
        <span className="tracking-wide">{initialsOf(profile)}</span>
      )}
      <span
        className={cn(
          "border-background absolute right-0 bottom-0 rounded-full",
          dotClass,
          profile.status === "active" && "bg-emerald-500",
          profile.status === "invited" && "bg-amber-400",
          profile.status === "inactive" && "bg-zinc-400",
        )}
      />
    </div>
  );
}

export function RolePill({
  role,
  showIcon = true,
  size = "sm",
}: {
  role: FacilityStaffRole;
  showIcon?: boolean;
  size?: "sm" | "md";
}) {
  const meta = ROLE_META[role];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        "border-border/60",
        meta.accent,
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
      )}
    >
      {showIcon && <RoleIcon role={role} className="size-3" />}
      {meta.label}
    </span>
  );
}

export function ServiceChip({
  module,
  size = "sm",
}: {
  module: ServiceModule;
  size?: "sm" | "md";
}) {
  const meta = SERVICE_MODULE_META[module];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md font-medium",
        meta.tone,
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
      )}
    >
      <ServiceIcon
        module={module}
        className={size === "sm" ? "size-3" : "size-3.5"}
      />
      {meta.label}
    </span>
  );
}

export function ScopeBadge({ scope }: { scope: AccessScope }) {
  const meta = ACCESS_SCOPE_META[scope];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium",
        meta.tone,
      )}
    >
      {meta.label}
    </span>
  );
}

export function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
