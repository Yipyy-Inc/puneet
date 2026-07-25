"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Compact icon link for the top-nav action cluster (Calling, Booking Requests,
// …). Same footprint as the other header icon buttons (size-10 rounded-xl
// ghost) so it lines up whether inline on desktop or inside the "More" popover.
export function HeaderNavIconButton({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={label}
            className="relative size-10 rounded-xl"
          >
            <Link href={href}>
              <Icon className="text-muted-foreground size-5" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
