"use client";

import "leaflet/dist/leaflet.css";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import L from "leaflet";
import type {
  LatLngExpression,
  LatLngTuple,
  LeafletMouseEvent,
  Map as LeafletMap,
} from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
  ZoomControl,
} from "react-leaflet";
import { cn } from "@/lib/utils";

// ─── Public types ────────────────────────────────────────────────────────────

export type LatLng = LatLngTuple; // [lat, lng]

export interface MapOverlayArea {
  id: string;
  name: string;
  color: string;
  polygon: LatLng[];
}

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label?: string;
}

export interface ServiceAreaMapHandle {
  fitToPolygon: (polygon: LatLng[]) => void;
}

interface ServiceAreaMapProps {
  /**
   * Polygon currently being authored. Renders the closed shape (when 3+
   * vertices) plus a dashed in-progress line back to the cursor / first point.
   */
  drawingPolygon?: LatLng[];
  /** Called with each vertex the user clicks while in draw mode. */
  onAddVertex?: (point: LatLng) => void;
  /** Called when the user clicks the first vertex to close the polygon. */
  onClosePolygon?: () => void;
  /** Whether map clicks should add a vertex. */
  drawing?: boolean;
  /**
   * Stroke / fill color for the active drawing polygon. Defaults to dark
   * slate when omitted. Pass the editor's currently-selected area color so
   * the drawn area previews in its final color.
   */
  drawingColor?: string;
  /**
   * Areas to render behind the current drawing (e.g., other service areas,
   * union of ZIP polygons). Each gets its own color and a faint fill.
   */
  overlays?: MapOverlayArea[];
  /** Active client pins (rendered as small filled circles). */
  pins?: MapPin[];
  /** Initial map center / zoom. Defaults to Los Angeles. */
  center?: LatLng;
  zoom?: number;
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DEFAULT_CENTER: LatLng = [34.0522, -118.2437]; // Los Angeles
const DEFAULT_ZOOM = 11;

function ClickHandler({
  drawing,
  drawingPolygon,
  onAddVertex,
}: {
  drawing: boolean;
  drawingPolygon: LatLng[];
  onAddVertex?: (point: LatLng) => void;
}) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      if (!drawing || !onAddVertex) return;
      onAddVertex([e.latlng.lat, e.latlng.lng]);
    },
  });
  // Use polygon length to keep the closure stable inside useMapEvents callback;
  // this also gives us a place to react if needed.
  void drawingPolygon.length;
  return null;
}

function FitOnOverlays({ overlays }: { overlays: MapOverlayArea[] }) {
  const map = useMap();
  const fittedRef = useRef(false);
  useEffect(() => {
    if (fittedRef.current) return;
    if (overlays.length === 0) return;
    const all = overlays.flatMap((o) => o.polygon);
    if (all.length === 0) return;
    const bounds = L.latLngBounds(all as LatLngExpression[]);
    map.fitBounds(bounds, { padding: [40, 40] });
    fittedRef.current = true;
  }, [overlays, map]);
  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ServiceAreaMap = forwardRef<
  ServiceAreaMapHandle,
  ServiceAreaMapProps
>(function ServiceAreaMap(
  {
    drawingPolygon = [],
    onAddVertex,
    onClosePolygon,
    drawing = false,
    drawingColor = "#0f172a",
    overlays = [],
    pins = [],
    center = DEFAULT_CENTER,
    zoom = DEFAULT_ZOOM,
    className,
  },
  ref,
) {
  const mapRef = useRef<LeafletMap | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      fitToPolygon(polygon: LatLng[]) {
        const map = mapRef.current;
        if (!map || polygon.length === 0) return;
        const bounds = L.latLngBounds(polygon as LatLngExpression[]);
        map.fitBounds(bounds, { padding: [40, 40] });
      },
    }),
    [],
  );

  // The first vertex doubles as the "close shape" target — clicking it ends
  // the draw. Render it slightly larger so users can hit it.
  const firstVertex = drawingPolygon[0];

  const livePolyline = useMemo<LatLng[]>(() => {
    if (drawingPolygon.length < 2) return [];
    return drawingPolygon;
  }, [drawingPolygon]);

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-lg border bg-muted",
        className,
      )}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={false}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
        ref={(instance) => {
          mapRef.current = instance;
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />

        {/* Overlays — other areas / ZIP union, behind the active polygon */}
        {overlays.map((o) => (
          <Polygon
            key={o.id}
            positions={o.polygon as LatLngExpression[]}
            pathOptions={{
              color: o.color,
              weight: 2,
              fillColor: o.color,
              fillOpacity: 0.18,
              dashArray: undefined,
            }}
          />
        ))}

        {/* Active drawing polygon (closed) */}
        {drawingPolygon.length >= 3 && (
          <Polygon
            positions={drawingPolygon as LatLngExpression[]}
            pathOptions={{
              color: drawingColor,
              weight: 2.5,
              fillColor: drawingColor,
              fillOpacity: 0.25,
            }}
          />
        )}
        {drawingPolygon.length === 2 && (
          <Polyline
            positions={livePolyline as LatLngExpression[]}
            pathOptions={{
              color: drawingColor,
              weight: 2.5,
              dashArray: "4 4",
            }}
          />
        )}

        {/* Vertex dots */}
        {drawingPolygon.map((pt, i) => {
          const isFirst = i === 0;
          return (
            <CircleMarker
              key={`v-${i}`}
              center={pt as LatLngExpression}
              radius={isFirst ? 7 : 5}
              pathOptions={{
                color: drawingColor,
                weight: 2,
                fillColor: isFirst ? "#10b981" : "#ffffff",
                fillOpacity: 1,
              }}
              eventHandlers={{
                click(e) {
                  if (!drawing) return;
                  // Closing tap on the first vertex finishes the polygon.
                  if (isFirst && drawingPolygon.length >= 3 && onClosePolygon) {
                    L.DomEvent.stopPropagation(e);
                    onClosePolygon();
                  }
                },
              }}
            />
          );
        })}

        {/* Client pins */}
        {pins.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng] as LatLngExpression}
            radius={5}
            pathOptions={{
              color: "#ea580c",
              weight: 2,
              fillColor: "#fb923c",
              fillOpacity: 0.95,
            }}
          />
        ))}

        <ClickHandler
          drawing={drawing}
          drawingPolygon={drawingPolygon}
          onAddVertex={onAddVertex}
        />
        <FitOnOverlays overlays={overlays} />
      </MapContainer>

      {/* Hint chip — only when drawing and no vertex yet */}
      {drawing && drawingPolygon.length === 0 && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[400] -translate-x-1/2 rounded-full bg-slate-900/85 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
          Click on the map to drop the first point
        </div>
      )}
      {drawing && drawingPolygon.length > 0 && drawingPolygon.length < 3 && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[400] -translate-x-1/2 rounded-full bg-slate-900/85 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
          Add at least {3 - drawingPolygon.length} more point
          {3 - drawingPolygon.length === 1 ? "" : "s"} to close the shape
        </div>
      )}
      {drawing &&
        drawingPolygon.length >= 3 &&
        firstVertex && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-[400] -translate-x-1/2 rounded-full bg-emerald-600/95 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
            Click the green point to close the shape
          </div>
        )}
    </div>
  );
});
