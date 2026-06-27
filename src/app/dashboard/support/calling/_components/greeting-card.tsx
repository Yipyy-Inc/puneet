"use client";

import { Pencil, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setActiveGreeting } from "@/lib/support-greeting-store";
import type { VoicemailGreeting } from "@/types/calling";

const TYPE_BADGE: Record<string, string> = {
  default: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-300",
  after_hours:
    "border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-300",
  holiday:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  temporary:
    "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
};

export function GreetingCard({
  greeting,
  onEdit,
}: {
  greeting: VoicemailGreeting;
  onEdit: (greeting: VoicemailGreeting) => void;
}) {
  const active = greeting.isActive;
  const autoManaged = greeting.type === "default";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setActiveGreeting(greeting.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setActiveGreeting(greeting.id);
        }
      }}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all",
        active ? "border-primary/40 bg-primary/5" : "hover:bg-muted/40",
      )}
    >
      {/* Radio — filled when active */}
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          active ? "border-primary" : "border-muted-foreground/30",
        )}
        aria-hidden
      >
        {active && <span className="bg-primary size-2 rounded-full" />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{greeting.name}</span>
          <Badge
            variant="outline"
            className={cn("text-[10px] capitalize", TYPE_BADGE[greeting.type])}
          >
            {greeting.type.replace("_", " ")}
          </Badge>
          {active && <Badge className="h-4 px-1.5 text-[10px]">Active</Badge>}
          {autoManaged && (
            <Badge
              variant="outline"
              className="h-4 gap-0.5 border-emerald-500/20 bg-emerald-500/10 px-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
            >
              <Zap className="size-2.5" />
              Auto-managed
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
          {greeting.transcription}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        aria-label={`Edit ${greeting.name}`}
        className="size-7 shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(greeting);
        }}
      >
        <Pencil className="size-3.5" />
      </Button>
    </div>
  );
}
