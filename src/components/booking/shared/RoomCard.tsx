"use client";

import { CheckCircle, Bed, Dog, Cat, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RoomCardItem {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  included: string[];
  allowedPetTypes?: string[];
  minWeightLbs?: number;
  maxWeightLbs?: number;
  totalRooms?: number;
  bookedRooms?: number;
  images?: string[];
  notes?: string;
}

export interface RoomCardProps {
  room: RoomCardItem;
  selected?: boolean;
  disabled?: boolean;
  /** e.g. "3 available" or "Limited availability" */
  availabilityLabel?: string;
  onViewDetails?: () => void;
  onClick?: () => void;
  className?: string;
  /** Compact mode (e.g. per-pet grid) */
  compact?: boolean;
}

export function RoomCard({
  room,
  selected = false,
  disabled = false,
  availabilityLabel,
  onViewDetails,
  onClick,
  className,
  compact = false,
}: RoomCardProps) {
  const available =
    room.totalRooms != null && room.bookedRooms != null
      ? room.totalRooms - room.bookedRooms
      : null;
  const label =
    availabilityLabel ??
    (available != null
      ? available <= 2
        ? "Limited availability"
        : `${available} available`
      : null);

  const content = (
    <>
      <div
        className={cn(
          "bg-muted relative shrink-0",
          compact ? "h-36" : "h-44"
        )}
      >
        {room.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={room.image}
            alt={room.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Bed className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        {selected && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
            <CheckCircle className={compact ? "h-4 w-4" : "h-5 w-5"} />
          </div>
        )}
      </div>
      <div className={cn("flex flex-col flex-1", compact ? "p-3" : "p-4")}>
        <h3 className={cn("font-semibold", compact ? "" : "text-lg")}>
          {room.name}
        </h3>
        <p className="text-primary font-bold text-sm mt-0.5">
          ${room.price}/night
        </p>
        <p
          className={cn(
            "text-muted-foreground line-clamp-2 mt-1",
            compact ? "text-xs" : "text-sm"
          )}
        >
          {room.description}
        </p>
        <ul
          className={cn(
            "text-muted-foreground mt-2 space-y-1",
            compact ? "text-xs space-y-0.5" : "text-xs"
          )}
        >
          {(compact ? room.included.slice(0, 3) : room.included).map(
            (item, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                {item}
              </li>
            )
          )}
        </ul>
        {room.allowedPetTypes && room.allowedPetTypes.length > 0 && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            {room.allowedPetTypes.includes("Dog") && (
              <Dog className="h-3.5 w-3.5" />
            )}
            {room.allowedPetTypes.includes("Cat") && (
              <Cat className="h-3.5 w-3.5" />
            )}
            {(room.minWeightLbs != null || room.maxWeightLbs != null) && (
              <span>
                {room.minWeightLbs != null && `≥${room.minWeightLbs} lbs`}
                {room.maxWeightLbs != null &&
                  ` ≤${room.maxWeightLbs} lbs`}
              </span>
            )}
          </div>
        )}
        {label && (
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        )}
        {onViewDetails && (
          <Button
            type="button"
            variant={compact ? "ghost" : "outline"}
            size="sm"
            className="mt-auto w-full text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
          >
            <Info className="h-3.5 w-3.5 mr-1" />
            View details
          </Button>
        )}
      </div>
    </>
  );

  const wrapperClass = cn(
    "flex flex-col border-2 rounded-xl overflow-hidden transition-all text-left",
    compact ? "min-h-[300px]" : "min-h-[360px]",
    disabled && "opacity-60 cursor-not-allowed",
    !disabled && "cursor-pointer",
    selected && !disabled && "ring-2 ring-primary border-primary bg-primary/5",
    !selected && !disabled && "border-border hover:border-primary/50",
    className
  );

  if (onClick && !disabled) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onClick()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        className={wrapperClass}
      >
        {content}
      </div>
    );
  }

  return <div className={wrapperClass}>{content}</div>;
}
