"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Layers, Users, MapPin, Pencil, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceArea } from "@/types/grooming";
import { zipsToPolygons } from "@/data/zip-boundaries";
import { clients as allClients } from "@/data/clients";
import { clientLatLng } from "@/lib/grooming-client-locations";
import type {
  LatLng,
  MapOverlayArea,
  MapPin as MapPinType,
} from "./service-area-map";

const ServiceAreaMap = dynamic(
  () => import("./service-area-map").then((m) => m.ServiceAreaMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted/30">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

interface ServiceAreasMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areas: ServiceArea[];
}

/**
 * Read-only map showing every saved service area at once. Used from the
 * Route Planner so dispatchers can see the full territory map without
 * leaving the page.
 */
export function ServiceAreasMapDialog({
  open,
  onOpenChange,
  areas,
}: ServiceAreasMapDialogProps) {
  const [showClients, setShowClients] = useState(false);
  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(areas.map((a) => [a.id, true])),
  );

  const overlays: MapOverlayArea[] = useMemo(() => {
    const out: MapOverlayArea[] = [];
    for (const a of areas) {
      if (!a.active) continue;
      if (visible[a.id] === false) continue;
      const fill = a.color ?? "#10b981";
      if (a.type === "draw" && a.polygon && a.polygon.length >= 3) {
        out.push({
          id: a.id,
          name: a.name,
          color: fill,
          polygon: a.polygon as LatLng[],
        });
        continue;
      }
      if (a.type === "postal" && a.postalCodes?.length) {
        const polys = zipsToPolygons(a.postalCodes);
        polys.forEach((p, i) => {
          out.push({
            id: `${a.id}-${p.zip}-${i}`,
            name: a.name,
            color: fill,
            polygon: p.polygon,
          });
        });
      }
    }
    return out;
  }, [areas, visible]);

  const pins: MapPinType[] = useMemo(() => {
    if (!showClients) return [];
    return allClients
      .filter((c) => c.status === "active")
      .map((c) => {
        const [lat, lng] = clientLatLng(c);
        return { id: String(c.id), lat, lng, label: c.name };
      });
  }, [showClients]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-6xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Layers className="size-5 text-sky-600" />
            Service Areas Map
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 gap-0">
          {/* Sidebar — legend with per-area visibility toggles */}
          <aside className="w-72 shrink-0 border-r p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Areas ({areas.length})
            </p>
            <ul className="mt-2 space-y-1.5">
              {areas.length === 0 && (
                <li className="text-xs text-muted-foreground">
                  No service areas yet. Add one in Mobile Grooming settings.
                </li>
              )}
              {areas.map((a) => {
                const TypeIcon =
                  a.type === "draw"
                    ? Pencil
                    : a.type === "postal"
                      ? Hash
                      : MapPin;
                const on = visible[a.id] !== false;
                return (
                  <li
                    key={a.id}
                    className={cn(
                      "flex items-center gap-2 rounded-md border bg-card p-2 text-sm transition-opacity",
                      !a.active && "opacity-50",
                    )}
                  >
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: a.color ?? "#10b981" }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {a.name || "(unnamed)"}
                      </p>
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <TypeIcon className="size-2.5" />
                        {a.type === "draw"
                          ? `${(a.polygon ?? []).length} pts`
                          : a.type === "postal"
                            ? `${(a.postalCodes ?? []).length} ZIPs`
                            : `${a.radiusKm ?? 0} km`}
                      </p>
                    </div>
                    <Switch
                      checked={on}
                      onCheckedChange={(v) =>
                        setVisible((prev) => ({ ...prev, [a.id]: v }))
                      }
                      className="scale-75"
                    />
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 border-t pt-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <Switch
                  checked={showClients}
                  onCheckedChange={setShowClients}
                  className="scale-75"
                />
                <Users className="size-3.5 text-muted-foreground" />
                Show active clients
              </label>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Pins use mocked positions for the demo.
              </p>
            </div>

            <div className="mt-4 border-t pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Legend
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Pencil className="size-2.5" />
                  Drawn
                </Badge>
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Hash className="size-2.5" />
                  ZIP
                </Badge>
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <MapPin className="size-2.5" />
                  Radius
                </Badge>
              </div>
            </div>
          </aside>

          {/* Map fills the rest */}
          <div className="relative flex-1">
            <ServiceAreaMap
              overlays={overlays}
              pins={pins}
              className="rounded-none border-0"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
