"use client";

import Image from "next/image";
import { CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ServiceCardItem {
  id: string;
  name: string;
  description?: string;
  image?: string;
  basePrice?: number;
  included?: string[];
  icon?: React.ComponentType<{ className?: string }>;
}

export interface ServiceCardProps {
  service: ServiceCardItem;
  /** Display name override (e.g. from facility config) */
  displayName?: string;
  /** Description override */
  displayDescription?: string;
  /** Price override (e.g. from config) */
  displayPrice?: number;
  selected?: boolean;
  disabled?: boolean;
  /** e.g. "Evaluation required" */
  badge?: string;
  onClick?: () => void;
  className?: string;
  /** Max bullets to show (default 4) */
  maxIncluded?: number;
}

export function ServiceCard({
  service,
  displayName,
  displayDescription,
  displayPrice,
  selected = false,
  disabled = false,
  badge,
  onClick,
  className,
  maxIncluded = 4,
}: ServiceCardProps) {
  const name = displayName ?? service.name;
  const description = displayDescription ?? service.description ?? "";
  const price = displayPrice ?? service.basePrice ?? 0;
  const included = service.included ?? [];
  const Icon = service.icon;

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        `relative flex min-h-[340px] flex-col overflow-hidden rounded-xl border-2 text-left transition-all`,
        disabled && "cursor-not-allowed opacity-50",
        !disabled && "cursor-pointer",
        selected &&
          !disabled &&
          "border-primary bg-primary/5 ring-primary shadow-md ring-2",
        !selected &&
          !disabled &&
          `border-border hover:border-primary/50 hover:shadow-sm`,
        className,
      )}
    >
      {badge && (
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="secondary" className="text-xs">
            {badge}
          </Badge>
        </div>
      )}
      <div className="bg-muted relative h-44 w-full shrink-0">
        {service.image ? (
          <Image
            src={service.image}
            alt={name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : Icon ? (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center",
              selected && !disabled
                ? "bg-primary text-primary-foreground"
                : "bg-muted",
            )}
          >
            <Icon className="h-14 w-14" />
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg/tight font-semibold">{name}</h3>
          {selected && !disabled && (
            <CheckCircle className="text-primary mt-0.5 h-5 w-5 shrink-0" />
          )}
        </div>
        {description && (
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {description}
          </p>
        )}
        {included.length > 0 && (
          <ul className="text-muted-foreground mt-1 space-y-1 text-xs">
            {included.slice(0, maxIncluded).map((item, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <CheckCircle className="text-primary h-3.5 w-3.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto pt-2">
          <p className="text-primary text-lg font-bold">
            {price === 0 ? "Free" : `From $${price}`}
          </p>
        </div>
      </div>
    </div>
  );
}
