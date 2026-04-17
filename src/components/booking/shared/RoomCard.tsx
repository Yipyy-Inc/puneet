"use client";

import Image from "next/image";
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
        className={cn("bg-muted relative shrink-0", compact ? "h-36" : "h-44")}
      >
        {room.image ? (
          <Image
            src={room.image}
            alt={room.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Bed className="text-muted-foreground size-8" />
          </div>
        )}
        {selected && (
          <div className="bg-primary text-primary-foreground absolute top-2 right-2 rounded-full p-1">
            <CheckCircle className={compact ? "size-4" : "size-5"} />
          </div>
        )}
      </div>
      <div className={cn("flex flex-1 flex-col", compact ? "p-3" : "p-4")}>
        <h3 className={cn("font-semibold", compact ? "" : "text-lg")}>
          {room.name}
        </h3>
        <p className="text-primary mt-0.5 text-sm font-bold">
          ${room.price}/night
        </p>
        <p
          className={cn(
            "text-muted-foreground mt-1 line-clamp-2",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {room.description}
        </p>
        <ul
          className={cn(
            "text-muted-foreground mt-2 space-y-1",
            compact ? "space-y-0.5 text-xs" : "text-xs",
          )}
        >
          {(compact ? room.included.slice(0, 3) : room.included).map(
            (item, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <CheckCircle className="text-primary size-3.5 shrink-0" />
                {item}
              </li>
            ),
          )}
        </ul>
        {room.allowedPetTypes && room.allowedPetTypes.length > 0 && (
          <div className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
            {room.allowedPetTypes.includes("Dog") && (
              <Dog className="size-3.5" />
            )}
            {room.allowedPetTypes.includes("Cat") && (
              <Cat className="size-3.5" />
            )}
            {(room.minWeightLbs != null || room.maxWeightLbs != null) && (
              <span>
                {room.minWeightLbs != null && `≥${room.minWeightLbs} lbs`}
                {room.maxWeightLbs != null && ` ≤${room.maxWeightLbs} lbs`}
              </span>
            )}
          </div>
        )}
        {label && <p className="text-muted-foreground mt-1 text-xs">{label}</p>}
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
            <Info className="mr-1 size-3.5" />
            View details
          </Button>
        )}
      </div>
    </>
  );

  const wrapperClass = cn(
    "flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all",
    compact ? "min-h-[300px]" : "min-h-[360px]",
    disabled && "cursor-not-allowed opacity-60",
    !disabled && "cursor-pointer",
    selected && !disabled && "border-transparent bg-primary/5 shadow-sm",
    !selected &&
      !disabled &&
      `
      border-border
      hover:border-primary/50
    `,
    className,
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
