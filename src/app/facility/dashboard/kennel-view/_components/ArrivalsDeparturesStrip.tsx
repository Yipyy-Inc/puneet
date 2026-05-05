"use client";

import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArrivalsDeparturesStripProps {
  arrivalsCount: number;
  departuresCount: number;
  focus: "none" | "arrivals" | "departures";
  onFocusChange: (focus: "none" | "arrivals" | "departures") => void;
}

export function ArrivalsDeparturesStrip({
  arrivalsCount,
  departuresCount,
  focus,
  onFocusChange,
}: ArrivalsDeparturesStripProps) {
  return (
    <div className="from-primary/5 to-background flex items-center gap-2 border-b bg-linear-to-r px-3 py-2">
      <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
        Today
      </span>
      <Button
        variant={focus === "arrivals" ? "default" : "outline"}
        size="sm"
        className={cn(
          "h-7 gap-1.5 rounded-full px-3 text-xs",
          focus === "arrivals" && "bg-cyan-500 hover:bg-cyan-600",
        )}
        onClick={() =>
          onFocusChange(focus === "arrivals" ? "none" : "arrivals")
        }
      >
        <LogIn className="size-3" />
        Arrivals
        <span
          className={cn(
            "ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
            focus === "arrivals"
              ? "bg-white/20"
              : "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200",
          )}
        >
          {arrivalsCount}
        </span>
      </Button>
      <Button
        variant={focus === "departures" ? "default" : "outline"}
        size="sm"
        className={cn(
          "h-7 gap-1.5 rounded-full px-3 text-xs",
          focus === "departures" && "bg-fuchsia-500 hover:bg-fuchsia-600",
        )}
        onClick={() =>
          onFocusChange(focus === "departures" ? "none" : "departures")
        }
      >
        <LogOut className="size-3" />
        Departures
        <span
          className={cn(
            "ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
            focus === "departures"
              ? "bg-white/20"
              : "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-200",
          )}
        >
          {departuresCount}
        </span>
      </Button>
      {focus !== "none" && (
        <span className="text-muted-foreground ml-2 text-xs">
          Highlighting {focus} on the grid
        </span>
      )}
    </div>
  );
}
