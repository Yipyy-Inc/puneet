"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Pencil,
  Hash,
  Undo2,
  Eraser,
  Users,
  Layers,
  Search,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { ServiceArea } from "@/types/grooming";
import { DAY_SHORT, formatDaysOfWeek } from "@/lib/service-areas";
import {
  ZIP_BOUNDARIES,
  searchZips,
  zipsToPolygons,
  type ZipBoundary,
} from "@/data/zip-boundaries";
import { clients as allClients } from "@/data/clients";
import { clientLatLng } from "@/lib/grooming-client-locations";
import type {
  LatLng,
  MapOverlayArea,
  MapPin,
  ServiceAreaMapHandle,
} from "./service-area-map";

// Leaflet needs `window`, so import the map client-only.
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

// ─── Palette ─────────────────────────────────────────────────────────────────

const AREA_COLORS = [
  "#10b981", // emerald
  "#0ea5e9", // sky
  "#6366f1", // indigo
  "#a855f7", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f97316", // orange
  "#eab308", // yellow
  "#84cc16", // lime
  "#06b6d4", // cyan
  "#475569", // slate
  "#0f172a", // dark slate
];

// ─── Public API ──────────────────────────────────────────────────────────────

const FACILITY_ID = 11;

function makeBlank(): ServiceArea {
  return {
    id: `area-${Date.now()}`,
    facilityId: FACILITY_ID,
    name: "",
    type: "draw",
    polygon: [],
    daysOfWeek: [1, 2, 3, 4, 5],
    active: true,
    color: AREA_COLORS[0],
  };
}

interface ServiceAreaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing area when editing. Pass undefined to create. */
  initial?: ServiceArea;
  /** Other areas to show as faint overlays when the user toggles it. */
  otherAreas: ServiceArea[];
  onSave: (area: ServiceArea) => void;
}

export function ServiceAreaDialog({
  open,
  onOpenChange,
  initial,
  otherAreas,
  onSave,
}: ServiceAreaDialogProps) {
  const uid = useId();
  const mapRef = useRef<ServiceAreaMapHandle | null>(null);

  // ─── Form state ─────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [color, setColor] = useState(AREA_COLORS[0]);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [active, setActive] = useState(true);
  const [method, setMethod] = useState<"draw" | "postal">("draw");

  // Draw-mode state
  const [polygon, setPolygon] = useState<LatLng[]>([]);

  // ZIP-mode state
  const [zips, setZips] = useState<string[]>([]);
  const [zipQuery, setZipQuery] = useState("");
  const [zipSearchOpen, setZipSearchOpen] = useState(false);

  // Overlay toggles
  const [showOtherAreas, setShowOtherAreas] = useState(false);
  const [showActiveClients, setShowActiveClients] = useState(false);

  // ─── Hydrate from `initial` whenever the dialog opens ───────────────────
  useEffect(() => {
    if (!open) return;
    const seed = initial ?? makeBlank();
    setName(seed.name);
    setColor(seed.color ?? AREA_COLORS[0]);
    setDays(seed.daysOfWeek);
    setActive(seed.active);
    setMethod(seed.type === "postal" ? "postal" : "draw");
    setPolygon((seed.polygon ?? []) as LatLng[]);
    setZips(seed.postalCodes ?? []);
    setZipQuery("");
    setZipSearchOpen(false);
    setShowOtherAreas(false);
    setShowActiveClients(false);
  }, [open, initial]);

  // ─── Derived map data ───────────────────────────────────────────────────

  // Polygons resolved from the selected ZIPs — these render under the active
  // shape in ZIP mode so the user can preview the union.
  const zipResolved: ZipBoundary[] = useMemo(
    () => zipsToPolygons(zips),
    [zips],
  );

  // Other-area overlays. In Draw mode all "other" areas (excluding the one
  // being edited) show as faint polygons. In ZIP mode we also include the
  // currently-selected ZIP polygons (as the in-progress shape) under a
  // darker outline color, so the user can see the union as it grows.
  const overlays: MapOverlayArea[] = useMemo(() => {
    const out: MapOverlayArea[] = [];
    if (showOtherAreas) {
      for (const a of otherAreas) {
        if (a.id === initial?.id) continue;
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
    }
    // The in-progress ZIP polygons render as overlays too — same channel,
    // just with the active color so they feel distinct from "other" areas.
    if (method === "postal") {
      zipResolved.forEach((p, i) => {
        out.push({
          id: `active-zip-${p.zip}-${i}`,
          name: p.zip,
          color,
          polygon: p.polygon,
        });
      });
    }
    return out;
  }, [showOtherAreas, otherAreas, initial?.id, method, zipResolved, color]);

  const pins: MapPin[] = useMemo(() => {
    if (!showActiveClients) return [];
    return allClients
      .filter((c) => c.status === "active")
      .map((c) => {
        const [lat, lng] = clientLatLng(c);
        return { id: String(c.id), lat, lng, label: c.name };
      });
  }, [showActiveClients]);

  // When the user switches to ZIP mode with existing ZIPs, fit the map to
  // them so the preview lands on the right neighborhood.
  useEffect(() => {
    if (!open) return;
    if (method !== "postal") return;
    if (zipResolved.length === 0) return;
    const all = zipResolved.flatMap((z) => z.polygon);
    if (all.length === 0) return;
    mapRef.current?.fitToPolygon(all);
  }, [open, method, zipResolved]);

  // ─── Draw helpers ───────────────────────────────────────────────────────

  const handleAddVertex = useCallback((pt: LatLng) => {
    setPolygon((prev) => [...prev, pt]);
  }, []);

  const handleClosePolygon = useCallback(() => {
    // The polygon is already considered "closed" when length >= 3 — clicking
    // the first vertex is a UX confirmation. No data change needed.
  }, []);

  const handleUndo = useCallback(() => {
    setPolygon((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setPolygon([]);
  }, []);

  // ─── ZIP helpers ────────────────────────────────────────────────────────

  const zipResults = useMemo(() => {
    return searchZips(zipQuery).filter((z) => !zips.includes(z.zip));
  }, [zipQuery, zips]);

  const addZip = useCallback((zip: string) => {
    setZips((prev) => (prev.includes(zip) ? prev : [...prev, zip]));
    setZipQuery("");
  }, []);

  const removeZip = useCallback((zip: string) => {
    setZips((prev) => prev.filter((z) => z !== zip));
  }, []);

  // ─── Days / save ────────────────────────────────────────────────────────

  const toggleDay = useCallback((d: number) => {
    setDays((prev) =>
      prev.includes(d)
        ? prev.filter((x) => x !== d)
        : [...prev, d].sort((a, b) => a - b),
    );
  }, []);

  function handleSave() {
    if (!name.trim()) {
      toast.error("Area name is required");
      return;
    }
    if (method === "draw" && polygon.length < 3) {
      toast.error("Draw at least 3 points to form an area");
      return;
    }
    if (method === "postal" && zips.length === 0) {
      toast.error("Add at least one ZIP code");
      return;
    }
    const base: ServiceArea = {
      id: initial?.id ?? `area-${Date.now()}`,
      facilityId: FACILITY_ID,
      name: name.trim(),
      type: method === "draw" ? "draw" : "postal",
      daysOfWeek: days,
      active,
      color,
    };
    if (method === "draw") {
      // Strip any optional altitude — ServiceArea stores [lat, lng] pairs.
      base.polygon = polygon.map(([lat, lng]) => [lat, lng] as [number, number]);
    } else {
      base.postalCodes = zips;
    }
    onSave(base);
    onOpenChange(false);
  }

  const polygonReady = polygon.length >= 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-h-[960px] w-[96vw] !max-w-[1600px] flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-lg">
            {initial ? "Edit service area" : "Create service area"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          {/* ── Left column: form ─────────────────────────────────────── */}
          <aside className="flex w-[380px] shrink-0 flex-col gap-4 overflow-y-auto border-r p-5">
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-name`} className="text-xs">
                Area name <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`${uid}-name`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="North side · Downtown LA · Westside…"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Color</Label>
              <div className="flex flex-wrap items-center gap-1.5">
                {AREA_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={cn(
                      "size-6 rounded-full ring-2 ring-offset-2 ring-offset-background transition-transform",
                      color === c
                        ? "scale-110 ring-foreground"
                        : "ring-transparent hover:scale-105",
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Active days</Label>
              <div className="flex flex-wrap gap-1.5">
                {DAY_SHORT.map((label, i) => {
                  const checked = days.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        checked
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                          : "hover:bg-muted/40",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {formatDaysOfWeek(days)}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-[10px] text-muted-foreground">
                  Online bookings check the active flag
                </p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Method</Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      value: "draw" as const,
                      icon: Pencil,
                      title: "Draw",
                      hint: "Draw on the map",
                    },
                    {
                      value: "postal" as const,
                      icon: Hash,
                      title: "Zipcode",
                      hint: "Enter ZIPs",
                    },
                  ]
                ).map((opt) => {
                  const Icon = opt.icon;
                  const isActive = method === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMethod(opt.value)}
                      className={cn(
                        "group flex items-start gap-2 rounded-xl border-2 p-2.5 text-left transition-all",
                        isActive
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-muted-foreground/40 hover:bg-muted/40",
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg border-2",
                          isActive
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        <Icon className="size-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{opt.title}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {opt.hint}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Method-specific controls */}
            {method === "draw" ? (
              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Drawing</Label>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {polygon.length} pt{polygon.length === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Click the map to drop points. Click the first (green) point
                  to close the shape — at least 3 points needed.
                </p>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 flex-1 gap-1.5"
                    disabled={polygon.length === 0}
                    onClick={handleUndo}
                  >
                    <Undo2 className="size-3.5" />
                    Undo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 flex-1 gap-1.5 text-destructive hover:text-destructive"
                    disabled={polygon.length === 0}
                    onClick={handleClear}
                  >
                    <Eraser className="size-3.5" />
                    Clear
                  </Button>
                </div>
                {polygonReady && (
                  <p className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                    ✓ Polygon ready to save
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs">ZIP codes</Label>
                <div className="rounded-lg border bg-card p-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {zips.map((z) => {
                      const b = ZIP_BOUNDARIES.find((x) => x.zip === z);
                      return (
                        <span
                          key={z}
                          className="inline-flex items-center gap-1 rounded-full border bg-muted/60 py-0.5 pl-2 pr-1 text-xs font-medium"
                        >
                          {z}
                          {b && (
                            <span className="text-muted-foreground">
                              · {b.label}
                            </span>
                          )}
                          <button
                            type="button"
                            aria-label={`Remove ${z}`}
                            onClick={() => removeZip(z)}
                            className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      );
                    })}
                    <div className="relative min-w-[10rem] flex-1">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={zipQuery}
                        onChange={(e) => {
                          setZipQuery(e.target.value);
                          setZipSearchOpen(true);
                        }}
                        onFocus={() => setZipSearchOpen(true)}
                        onBlur={() => {
                          // Delay so a click on a result can fire first.
                          setTimeout(() => setZipSearchOpen(false), 120);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && zipResults[0]) {
                            e.preventDefault();
                            addZip(zipResults[0].zip);
                          }
                        }}
                        placeholder={
                          zips.length === 0
                            ? "Search ZIP…"
                            : "Add another…"
                        }
                        className="h-8 border-0 bg-transparent pl-7 text-sm shadow-none focus-visible:ring-0"
                      />
                      {zipSearchOpen && zipResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
                          {zipResults.map((r) => (
                            <button
                              key={r.zip}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                addZip(r.zip);
                              }}
                              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                            >
                              <span className="font-medium">{r.zip}</span>
                              <span className="text-muted-foreground">
                                {r.label}, {r.state}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {zips.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">
                    Search and pick ZIP codes — the map will show the union of
                    their boundaries.
                  </p>
                ) : (
                  <p className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                    ✓ {zips.length} ZIP{zips.length === 1 ? "" : "s"} ready to
                    save
                  </p>
                )}
              </div>
            )}
          </aside>

          {/* ── Right column: map ─────────────────────────────────────── */}
          <div className="relative flex-1">
            <ServiceAreaMap
              ref={mapRef}
              drawing={method === "draw"}
              drawingPolygon={method === "draw" ? polygon : []}
              drawingColor={color}
              onAddVertex={handleAddVertex}
              onClosePolygon={handleClosePolygon}
              overlays={overlays}
              pins={pins}
              className="rounded-none border-0"
            />

            {/* Overlay toggles — float over the map top-right */}
            <div className="absolute right-3 top-3 z-[400] flex w-fit flex-col gap-1 rounded-lg border bg-card/95 p-2 shadow-md backdrop-blur">
              <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs">
                <Switch
                  checked={showOtherAreas}
                  onCheckedChange={setShowOtherAreas}
                  className="scale-75"
                />
                <Layers className="size-3.5 text-muted-foreground" />
                Other service areas
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs">
                <Switch
                  checked={showActiveClients}
                  onCheckedChange={setShowActiveClients}
                  className="scale-75"
                />
                <Users className="size-3.5 text-muted-foreground" />
                Active clients
              </label>
            </div>

            {/* Active drawing summary chip */}
            {method === "draw" && polygon.length > 0 && (
              <div className="absolute bottom-3 left-3 z-[400] rounded-full border bg-card/95 px-3 py-1 text-xs font-medium shadow-md backdrop-blur">
                <span className="text-muted-foreground">Points: </span>
                <span className="tabular-nums">{polygon.length}</span>
              </div>
            )}

            {/* Active ZIP summary chip */}
            {method === "postal" && zips.length > 0 && (
              <div className="absolute bottom-3 left-3 z-[400] flex items-center gap-1.5 rounded-full border bg-card/95 px-3 py-1 text-xs font-medium shadow-md backdrop-blur">
                <Badge
                  className="border-0 px-1.5 py-0 text-[10px]"
                  style={{ backgroundColor: color, color: "#fff" }}
                >
                  {zips.length}
                </Badge>
                ZIP{zips.length === 1 ? "" : "s"} selected
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t bg-muted/30 px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {initial ? "Save changes" : "Create area"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
