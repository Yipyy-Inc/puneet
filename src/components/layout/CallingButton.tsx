"use client";

import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function CallingButton() {
  const router = useRouter();

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.push("/facility/dashboard/calling")}
            aria-label="Calling"
            className="relative h-10 w-10 rounded-xl"
          >
            <Phone className="h-5 w-5 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center">
          Calling
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
