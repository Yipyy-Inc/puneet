"use client";

import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShellText } from "@/lib/shell/use-shell-text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function CallingButton() {
  const t = useShellText("header");
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
            aria-label={t("calling")}
            className="relative size-10 rounded-xl"
          >
            <Phone className="text-muted-foreground size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center">
          {t("calling")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
