"use client";

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
        "relative flex flex-col min-h-[340px] border-2 rounded-xl transition-all overflow-hidden text-left",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "cursor-pointer",
        selected && !disabled && "border-primary bg-primary/5 ring-2 ring-primary shadow-md",
        !selected && !disabled && "hover:border-primary/50 hover:shadow border-border",
        className
      )}
    >
      {badge && (
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="secondary" className="text-xs">
            {badge}
          </Badge>
        </div>
      )}
      <div className="w-full h-44 shrink-0 bg-muted">
        {service.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={service.image}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : Icon ? (
          <div
            className={cn(
              "w-full h-full flex items-center justify-center",
              selected && !disabled ? "bg-primary text-primary-foreground" : "bg-muted"
            )}
          >
            <Icon className="h-14 w-14" />
          </div>
        ) : null}
      </div>
      <div className="p-5 flex flex-col flex-1 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg leading-tight">{name}</h3>
          {selected && !disabled && (
            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        )}
        {included.length > 0 && (
          <ul className="text-xs text-muted-foreground space-y-1 mt-1">
            {included.slice(0, maxIncluded).map((item, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto pt-2">
          <p className="font-bold text-primary text-lg">
            {price === 0 ? "Free" : `From $${price}`}
          </p>
        </div>
      </div>
    </div>
  );
}
