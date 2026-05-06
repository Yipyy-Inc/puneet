"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Printer,
  CreditCard,
  Tag,
  Dog,
  PawPrint,
  Phone,
  Calendar,
  AlertTriangle,
  Pill,
  Utensils,
  User,
  Settings,
  ChevronDown,
  ChevronUp,
  Check,
  Palette,
  Contrast,
} from "lucide-react";
import type { BoardingGuest } from "@/data/boarding";

const QR_BASE = "https://care.doggieville.ca";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ── Print Options ─────────────────────────────────────────────────────────────

export type PrintOptions = {
  showOwnerName: boolean;
  showPhone: boolean;
  showEmergencyVet: boolean;
  showBehaviorTags: boolean;
  showWeight: boolean;
  showNotes: boolean;
};

export const DEFAULT_PRINT_OPTIONS: PrintOptions = {
  showOwnerName: true,
  showPhone: true,
  showEmergencyVet: true,
  showBehaviorTags: true,
  showWeight: true,
  showNotes: true,
};

// Collar-label-only field toggles. Boarding Sheet / Bin Label use PrintOptions above.
export type CollarFields = {
  petName: boolean;
  breed: boolean;
  age: boolean;
  clientName: boolean;
  lodging: boolean;
  playgroup: boolean;
  ifFound: boolean;
  facilityName: boolean;
  facilityPhone: boolean;
  facilityAddress: boolean;
};

export const DEFAULT_COLLAR_FIELDS: CollarFields = {
  petName: true,
  breed: true,
  age: true,
  clientName: true,
  lodging: true,
  playgroup: false,
  ifFound: true,
  facilityName: true,
  facilityPhone: true,
  facilityAddress: true,
};

export type FacilityInfo = {
  name: string;
  phone: string;
  address: string;
};

export const DEFAULT_FACILITY_INFO: FacilityInfo = {
  name: "Doggieville MTL",
  phone: "(514) 555-0100",
  address: "1234 Rue Sainte-Catherine, Montréal, QC",
};

// ── Tag pill helper (print-safe, no Tailwind dark variants) ───────────────────

const PRINT_TAG_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  "Bite Risk":         { bg: "#fee2e2", color: "#991b1b", border: "#f87171" },
  "Food Aggressive":   { bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5" },
  "Resource Guarder":  { bg: "#ffedd5", color: "#c2410c", border: "#fdba74" },
  "Dog Selective":     { bg: "#ffedd5", color: "#c2410c", border: "#fdba74" },
  Jumper:              { bg: "#fef9c3", color: "#a16207", border: "#fde047" },
  "Escape Artist":     { bg: "#fef3c7", color: "#92400e", border: "#fcd34d" },
  "No Jumping":        { bg: "#ffedd5", color: "#9a3412", border: "#fdba74" },
  "No Stairs":         { bg: "#ffedd5", color: "#9a3412", border: "#fdba74" },
  "Needs Slow Introduction": { bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" },
  Barker:              { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
  "High Energy":       { bg: "#dcfce7", color: "#15803d", border: "#86efac" },
  Anxiety:             { bg: "#ede9fe", color: "#6d28d9", border: "#c4b5fd" },
  Nervous:             { bg: "#e0e7ff", color: "#3730a3", border: "#a5b4fc" },
  Friendly:            { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
  "Loves Staff":       { bg: "#fce7f3", color: "#9d174d", border: "#f9a8d4" },
  Puppy:               { bg: "#ecfccb", color: "#3f6212", border: "#bef264" },
  Senior:              { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
  "Needs Blanket":     { bg: "#e0f2fe", color: "#0369a1", border: "#7dd3fc" },
  "Special Diet":      { bg: "#ffedd5", color: "#c2410c", border: "#fdba74" },
  "Medical Condition": { bg: "#fef3c7", color: "#92400e", border: "#fcd34d" },
};

function PrintTag({ tag }: { tag: string }) {
  const c = PRINT_TAG_COLORS[tag] ?? { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" };
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        borderRadius: "9999px",
        padding: "2px 8px",
        fontSize: "11px",
        fontWeight: 600,
        display: "inline-block",
        marginRight: "4px",
        marginBottom: "4px",
      }}
    >
      {tag}
    </span>
  );
}

// ── Kennel Card (full info, ~A5 portrait) ────────────────────────────────────

export function KennelCardTemplate({
  guest,
  options = DEFAULT_PRINT_OPTIONS,
}: {
  guest: BoardingGuest;
  options?: PrintOptions;
}) {
  const behaviorTags = guest.tags ?? [];

  return (
    <div className="w-[640px] bg-white p-6 font-sans text-black print:w-full">
      {/* Header */}
      <div className="flex items-start gap-4 border-b-2 border-gray-800 pb-4">
        <div className="flex size-28 shrink-0 items-center justify-center rounded-xl bg-gray-100">
          <PawPrint className="size-14 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-black leading-tight tracking-tight">
            {guest.petName}{" "}
            <span className="text-2xl font-semibold text-gray-400">
              {guest.ownerName.split(" ").pop()}
            </span>
          </h1>
          <p className="text-base text-gray-500">{guest.petBreed}</p>
          {options.showWeight && (
            <p className="mt-0.5 text-sm text-gray-400">
              {guest.petSize.charAt(0).toUpperCase() + guest.petSize.slice(1)}
              {" · "}
              {guest.petWeight} lbs
              {" · "}
              {guest.petColor}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="rounded-lg bg-gray-900 px-3 py-1.5 text-center text-white">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400">
              Kennel
            </p>
            <p className="text-lg font-black leading-tight">
              {guest.kennelName.split(" - ")[0]}
            </p>
          </div>
          <QRCodeSVG value={`${QR_BASE}/${guest.id}`} size={64} level="M" />
          <p className="text-[9px] text-gray-400">Scan for care sheet</p>
        </div>
      </div>

      {/* Behavior tags */}
      {options.showBehaviorTags && behaviorTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-0">
          {behaviorTags.map((tag) => (
            <PrintTag key={tag} tag={tag} />
          ))}
        </div>
      )}

      {/* Owner + Emergency */}
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {options.showOwnerName && (
          <span className="flex items-center gap-1.5">
            <User className="size-3.5 text-gray-400" />
            <span className="font-semibold">{guest.ownerName}</span>
          </span>
        )}
        {options.showPhone && (
          <span className="flex items-center gap-1.5">
            <Phone className="size-3.5 text-gray-400" />
            {guest.ownerPhone}
          </span>
        )}
        {options.showEmergencyVet && (
          <span className="text-gray-500">
            <span className="font-medium">Emerg. Vet:</span>{" "}
            {guest.emergencyVetContact}
          </span>
        )}
      </div>

      {/* Dates */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg border-2 border-green-400 bg-green-50 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-green-700">
            Check-In
          </p>
          <p className="text-base font-black">{fmtDate(guest.checkInDate)}</p>
          <p className="text-xs text-green-600">{guest.packageType}</p>
        </div>
        <div className="rounded-lg border-2 border-orange-400 bg-orange-50 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-orange-700">
            Check-Out
          </p>
          <p className="text-base font-black">{fmtDate(guest.checkOutDate)}</p>
          <p className="text-xs text-orange-600">{guest.totalNights} nights</p>
        </div>
      </div>

      {/* Allergy alert */}
      {guest.allergies.length > 0 && (
        <div className="mt-3 rounded-lg border-2 border-red-500 bg-red-50 p-3">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="size-4 text-red-600" />
            <span className="text-sm font-black uppercase tracking-wide text-red-700">
              ⚠ Allergies / Dietary Restrictions
            </span>
          </div>
          <p className="mt-1 font-bold text-red-800">
            {guest.allergies.join(" · ")}
          </p>
        </div>
      )}

      {/* Medications */}
      {guest.medications.length > 0 && (
        <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-purple-800">
            <Pill className="size-4" />
            <span className="text-sm font-bold uppercase">Medications</span>
          </div>
          <div className="space-y-1">
            {guest.medications.map((med) => (
              <p key={med.id} className="text-sm">
                <span className="font-bold">
                  {med.medicationName} {med.dosage}
                </span>
                <span className="text-gray-500"> — {med.frequency}</span>
                {med.times.length > 0 && (
                  <span className="text-gray-400"> @ {med.times.join(", ")}</span>
                )}
                {med.instructions && (
                  <span className="text-purple-600"> · {med.instructions}</span>
                )}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Feeding — time-separated breakdown */}
      <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-blue-800">
          <Utensils className="size-4" />
          <span className="text-sm font-bold uppercase">Feeding</span>
        </div>
        <div className="space-y-1">
          {guest.feedingTimes.map((time) => {
            const h = parseInt(time.split(":")[0], 10);
            const label = h < 11 ? "Breakfast" : h < 15 ? "Lunch" : "Dinner";
            return (
              <div key={time} className="text-sm">
                <span className="font-bold text-blue-800">
                  {label} — {time}
                </span>
                <ul className="ml-4 list-disc text-blue-700">
                  <li>
                    {guest.feedingAmount} {guest.foodBrand}
                  </li>
                  {guest.feedingInstructions && (
                    <li className="italic">{guest.feedingInstructions}</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Special care flags */}
      {(guest.postSurgery || guest.heatCycle) && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          {guest.postSurgery && (
            <p>
              <span className="font-bold text-amber-800">
                🏥 Post-Surgery ({guest.postSurgery.procedureType}):
              </span>{" "}
              <span className="text-amber-700">
                {guest.postSurgery.vetInstructions}
              </span>
            </p>
          )}
          {guest.heatCycle && (
            <p className="mt-1">
              <span className="font-bold text-amber-800">
                🌡 Heat Cycle (Day {guest.heatCycle.dayNumber}):
              </span>{" "}
              <span className="text-amber-700">
                {guest.heatCycle.notes ?? "Monitor, keep separated from intact males."}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Notes */}
      {options.showNotes && guest.notes && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
            Notes
          </p>
          <p className="mt-0.5 text-sm text-gray-700">{guest.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div suppressHydrationWarning className="mt-4 border-t pt-2 text-center text-[10px] text-gray-400">
        Doggieville MTL · Generated {new Date().toLocaleString()}
      </div>
    </div>
  );
}

// ── Door Card (compact kennel door badge / bin label) ────────────────────────

export function DoorCardTemplate({
  guest,
  options = DEFAULT_PRINT_OPTIONS,
}: {
  guest: BoardingGuest;
  options?: PrintOptions;
}) {
  const behaviorTags = guest.tags ?? [];
  const kennelParts = guest.kennelName.split(" - ");
  const kennelLabel = kennelParts[0];
  const kennelType = kennelParts[1];

  return (
    <div className="w-[640px] overflow-hidden rounded-2xl border-2 border-gray-900 bg-white font-sans text-black print:w-full">
      <div className="grid grid-cols-[170px_1fr]">
        {/* Left rail — kennel + QR */}
        <div className="flex flex-col items-center gap-3 bg-gray-900 p-4 text-white">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">
            Kennel
          </p>
          <p className="text-center text-[28px] font-black leading-none tracking-tight">
            {kennelLabel}
          </p>
          {kennelType && (
            <p className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-gray-200">
              {kennelType}
            </p>
          )}
          <div className="mt-auto flex flex-col items-center gap-1 rounded-lg bg-white p-2">
            <QRCodeSVG value={`${QR_BASE}/${guest.id}`} size={88} level="M" />
          </div>
          <p className="text-[9px] text-gray-400">Scan for care sheet</p>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-2 p-4">
          {/* Pet identity */}
          <div>
            <h1 className="text-3xl font-black leading-none tracking-tight">
              {guest.petName}
              <span className="ml-2 text-xl font-semibold text-gray-400">
                {guest.ownerName.split(" ").pop()}
              </span>
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {guest.petBreed}
              {options.showWeight && (
                <span className="text-gray-400">
                  {" · "}
                  {guest.petSize.charAt(0).toUpperCase() + guest.petSize.slice(1)}
                  {" · "}
                  {guest.petWeight} lbs · {guest.petColor}
                </span>
              )}
            </p>
          </div>

          {/* Stay window */}
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-sm">
            <Calendar className="size-3.5 text-gray-500" />
            <span className="font-semibold">{fmtDate(guest.checkInDate)}</span>
            <span className="text-gray-400">→</span>
            <span className="font-semibold">{fmtDate(guest.checkOutDate)}</span>
            <span className="ml-auto rounded-md bg-gray-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              {guest.totalNights} nights
            </span>
          </div>

          {/* Allergies — show contents, not just a pill */}
          {guest.allergies.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border-2 border-red-500 bg-red-50 px-3 py-1.5">
              <AlertTriangle className="size-4 shrink-0 text-red-600" />
              <span className="text-[10px] font-black uppercase tracking-wide text-red-700">
                Allergies
              </span>
              <span className="truncate text-xs font-bold text-red-800">
                {guest.allergies.join(" · ")}
              </span>
            </div>
          )}

          {/* Meds — one-line summary */}
          {guest.medications.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5">
              <Pill className="mt-0.5 size-3.5 shrink-0 text-purple-600" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black uppercase tracking-wide text-purple-700">
                  Meds:{" "}
                </span>
                <span className="text-xs text-purple-900">
                  {guest.medications
                    .map(
                      (m) =>
                        `${m.medicationName} ${m.dosage} (${m.frequency})`,
                    )
                    .join("; ")}
                </span>
              </div>
            </div>
          )}

          {/* Feeding — the thing a bin label is actually for */}
          <div className="flex items-start gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5">
            <Utensils className="mt-0.5 size-3.5 shrink-0 text-blue-600" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase tracking-wide text-blue-700">
                Feeding:{" "}
              </span>
              <span className="text-xs text-blue-900">
                {guest.feedingAmount} {guest.foodBrand}
                {guest.feedingTimes.length > 0 && (
                  <> · {guest.feedingTimes.join(", ")}</>
                )}
              </span>
              {guest.feedingInstructions && (
                <p className="text-[11px] italic text-blue-700">
                  {guest.feedingInstructions}
                </p>
              )}
            </div>
          </div>

          {/* Special flags */}
          {(guest.postSurgery || guest.heatCycle) && (
            <div className="flex flex-wrap gap-1.5">
              {guest.postSurgery && (
                <span className="rounded-full border border-orange-300 bg-orange-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-700">
                  Post-surgery · {guest.postSurgery.procedureType}
                </span>
              )}
              {guest.heatCycle && (
                <span className="rounded-full border border-pink-300 bg-pink-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-pink-700">
                  Heat cycle · day {guest.heatCycle.dayNumber}
                </span>
              )}
            </div>
          )}

          {/* Behavior tags */}
          {options.showBehaviorTags && behaviorTags.length > 0 && (
            <div className="flex flex-wrap gap-0">
              {behaviorTags.map((tag) => (
                <PrintTag key={tag} tag={tag} />
              ))}
            </div>
          )}

          {/* Owner */}
          {(options.showOwnerName || options.showPhone) && (
            <div className="mt-auto flex items-center gap-3 border-t border-gray-200 pt-2 text-xs">
              {options.showOwnerName && (
                <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                  <User className="size-3.5 text-gray-400" />
                  {guest.ownerName}
                </span>
              )}
              {options.showPhone && (
                <span className="flex items-center gap-1.5 text-gray-600">
                  <Phone className="size-3.5 text-gray-400" />
                  {guest.ownerPhone}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Collar Label (one per pet, escape-safety contact info) ───────────────────

/**
 * Collar label — wraps around a dog's collar. Designed so a stranger who finds
 * an escaped dog can immediately see who to call: the "If found" banner with
 * facility name + phone is the load-bearing element. Pet identity is at the
 * top, owner/lodging at the bottom.
 */
export function CollarLabelTemplate({
  guest,
  fields = DEFAULT_COLLAR_FIELDS,
  facility = DEFAULT_FACILITY_INFO,
}: {
  guest: BoardingGuest;
  fields?: CollarFields;
  facility?: FacilityInfo;
}) {
  const extras = guest as { petAge?: unknown; playgroup?: unknown };
  const petAge = typeof extras.petAge === "number" ? extras.petAge : null;
  const playgroup =
    typeof extras.playgroup === "string" ? extras.playgroup : "";

  const ageLabel = fields.age && petAge !== null ? `${petAge} yr` : null;

  const ownerParts: string[] = [];
  if (fields.clientName && guest.ownerName)
    ownerParts.push(`Owner: ${guest.ownerName}`);
  if (fields.lodging && guest.kennelName)
    ownerParts.push(guest.kennelName);
  if (fields.playgroup && playgroup) ownerParts.push(playgroup);

  const showIfFound =
    fields.ifFound &&
    ((fields.facilityName && !!facility.name) ||
      (fields.facilityPhone && !!facility.phone) ||
      (fields.facilityAddress && !!facility.address));

  return (
    <div
      style={{
        width: "108mm",
        boxSizing: "border-box",
        background: "#fff",
        color: "#000",
        border: "2px solid #111827",
        borderRadius: "3mm",
        overflow: "hidden",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Pet identity */}
      {(fields.petName || ageLabel || fields.breed) && (
        <div style={{ padding: "4mm 5mm 3mm" }}>
          {fields.petName && (
            <div
              style={{
                fontSize: "24pt",
                fontWeight: 800,
                lineHeight: 1.0,
                letterSpacing: "-0.5pt",
                wordBreak: "break-word",
              }}
            >
              {guest.petName}
              {ageLabel && (
                <span
                  style={{
                    fontSize: "12pt",
                    fontWeight: 600,
                    color: "#6b7280",
                    marginLeft: "3mm",
                  }}
                >
                  · {ageLabel}
                </span>
              )}
            </div>
          )}
          {!fields.petName && ageLabel && (
            <div
              style={{
                fontSize: "13pt",
                fontWeight: 600,
                color: "#6b7280",
                lineHeight: 1.1,
              }}
            >
              {ageLabel}
            </div>
          )}
          {fields.breed && guest.petBreed && (
            <div
              style={{
                marginTop: "1mm",
                fontSize: "9.5pt",
                fontWeight: 500,
                color: "#374151",
                lineHeight: 1.3,
              }}
            >
              {guest.petBreed}
            </div>
          )}
        </div>
      )}

      {/* If found — escape contact banner */}
      {showIfFound && (
        <div
          style={{
            background: "#fef2f2",
            borderTop: "2px solid #dc2626",
            borderBottom: "2px solid #dc2626",
            padding: "3mm 5mm",
          }}
        >
          <div
            style={{
              fontSize: "8pt",
              fontWeight: 800,
              color: "#991b1b",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              lineHeight: 1.1,
            }}
          >
            ⚠ If found, please call
          </div>
          {fields.facilityName && facility.name && (
            <div
              style={{
                marginTop: "1mm",
                fontSize: "11pt",
                fontWeight: 700,
                color: "#111827",
                lineHeight: 1.2,
              }}
            >
              {facility.name}
            </div>
          )}
          {fields.facilityPhone && facility.phone && (
            <div
              style={{
                fontSize: "16pt",
                fontWeight: 800,
                color: "#111827",
                letterSpacing: "0.3pt",
                lineHeight: 1.15,
              }}
            >
              {facility.phone}
            </div>
          )}
          {fields.facilityAddress && facility.address && (
            <div
              style={{
                marginTop: "0.5mm",
                fontSize: "8.5pt",
                color: "#374151",
                lineHeight: 1.3,
              }}
            >
              {facility.address}
            </div>
          )}
        </div>
      )}

      {/* Owner / lodging strip */}
      {ownerParts.length > 0 && (
        <div
          style={{
            padding: "2.5mm 5mm",
            fontSize: "9pt",
            fontWeight: 500,
            color: "#374151",
            lineHeight: 1.35,
            background: "#f9fafb",
          }}
        >
          {ownerParts.join(" · ")}
        </div>
      )}
    </div>
  );
}

// ── Customization panel ───────────────────────────────────────────────────────

type OptionToggle = {
  key: keyof PrintOptions;
  label: string;
};

const OPTION_TOGGLES: OptionToggle[] = [
  { key: "showOwnerName",    label: "Owner name" },
  { key: "showPhone",        label: "Phone number" },
  { key: "showEmergencyVet", label: "Emergency vet" },
  { key: "showBehaviorTags", label: "Behavior tags" },
  { key: "showWeight",       label: "Weight & size" },
  { key: "showNotes",        label: "Staff notes" },
];

function CustomizePanel({
  options,
  onChange,
}: {
  options: PrintOptions;
  onChange: (opts: PrintOptions) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {OPTION_TOGGLES.map(({ key, label }) => {
        const on = options[key];
        return (
          <button
            key={key}
            onClick={() => onChange({ ...options, [key]: !on })}
            data-on={on}
            className="flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm transition-all data-[on=true]:border-primary data-[on=true]:bg-primary/5 data-[on=false]:border-border data-[on=false]:text-muted-foreground data-[on=false]:hover:bg-muted/40"
          >
            <span
              data-on={on}
              className="flex size-4 shrink-0 items-center justify-center rounded data-[on=true]:bg-primary data-[on=false]:bg-muted"
            >
              {on && <Check className="size-3 text-primary-foreground" />}
            </span>
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Collar fields panel ───────────────────────────────────────────────────────

const COLLAR_PET_TOGGLES: { key: keyof CollarFields; label: string }[] = [
  { key: "petName",    label: "Pet name" },
  { key: "breed",      label: "Breed" },
  { key: "age",        label: "Age" },
  { key: "clientName", label: "Owner name" },
  { key: "lodging",    label: "Lodging" },
  { key: "playgroup",  label: "Playgroup" },
];

const COLLAR_FACILITY_TOGGLES: { key: keyof CollarFields; label: string }[] = [
  { key: "ifFound",          label: "If-found banner" },
  { key: "facilityName",     label: "Facility name" },
  { key: "facilityPhone",    label: "Phone" },
  { key: "facilityAddress",  label: "Address" },
];

function ToggleChip({
  on,
  label,
  onClick,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      data-on={on}
      className="flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm transition-all data-[on=true]:border-primary data-[on=true]:bg-primary/5 data-[on=false]:border-border data-[on=false]:text-muted-foreground data-[on=false]:hover:bg-muted/40"
    >
      <span
        data-on={on}
        className="flex size-4 shrink-0 items-center justify-center rounded data-[on=true]:bg-primary data-[on=false]:bg-muted"
      >
        {on && <Check className="size-3 text-primary-foreground" />}
      </span>
      {label}
    </button>
  );
}

function CollarFieldsPanel({
  fields,
  onChange,
  facility,
  onFacilityChange,
}: {
  fields: CollarFields;
  onChange: (next: CollarFields) => void;
  facility: FacilityInfo;
  onFacilityChange: (next: FacilityInfo) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Pet info
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {COLLAR_PET_TOGGLES.map(({ key, label }) => (
            <ToggleChip
              key={key}
              on={fields[key]}
              label={label}
              onClick={() => onChange({ ...fields, [key]: !fields[key] })}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          If found — facility contact
        </p>
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COLLAR_FACILITY_TOGGLES.map(({ key, label }) => (
            <ToggleChip
              key={key}
              on={fields[key]}
              label={label}
              onClick={() => onChange({ ...fields, [key]: !fields[key] })}
            />
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            placeholder="Facility name"
            value={facility.name}
            onChange={(e) =>
              onFacilityChange({ ...facility, name: e.target.value })
            }
          />
          <Input
            placeholder="Phone"
            value={facility.phone}
            onChange={(e) =>
              onFacilityChange({ ...facility, phone: e.target.value })
            }
          />
          <Input
            className="sm:col-span-2"
            placeholder="Address"
            value={facility.address}
            onChange={(e) =>
              onFacilityChange({ ...facility, address: e.target.value })
            }
          />
        </div>
      </div>
    </div>
  );
}

// ── PrintKennelCardsModal ─────────────────────────────────────────────────────

type PrintFormat = "kennel" | "door" | "collar";
type PrintScope = "all" | string;
type ColorMode = "color" | "bw";

type Props = {
  open: boolean;
  onClose: () => void;
  guests: BoardingGuest[];
  /** Pre-select a format (used by check-in prompt) */
  initialFormat?: PrintFormat;
};

export function PrintKennelCardsModal({
  open,
  onClose,
  guests,
  initialFormat,
}: Props) {
  const [format, setFormat] = useState<PrintFormat>(initialFormat ?? "kennel");
  const [scope, setScope] = useState<PrintScope>("all");
  const [options, setOptions] = useState<PrintOptions>(DEFAULT_PRINT_OPTIONS);
  const [collarFields, setCollarFields] = useState<CollarFields>(
    DEFAULT_COLLAR_FIELDS,
  );
  const [facilityInfo, setFacilityInfo] = useState<FacilityInfo>(
    DEFAULT_FACILITY_INFO,
  );
  const [showCustomize, setShowCustomize] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>("color");

  const guestsToRender =
    scope === "all" ? guests : guests.filter((g) => g.id === scope);

  const handlePrint = () => {
    onClose();
    setTimeout(() => {
      document.body.setAttribute("data-kennel-printing", "1");
      window.print();
      document.body.removeAttribute("data-kennel-printing");
    }, 150);
  };

  return (
    <>
      {/* Hidden print area */}
      <div id="kennel-print-area" data-color-mode={colorMode} aria-hidden>
        {guestsToRender.map((guest, i) => (
          <div
            key={guest.id}
            style={{
              pageBreakAfter:
                i < guestsToRender.length - 1 ? "always" : "auto",
            }}
          >
            {format === "kennel" ? (
              <KennelCardTemplate guest={guest} options={options} />
            ) : format === "door" ? (
              <DoorCardTemplate guest={guest} options={options} />
            ) : (
              <CollarLabelTemplate
                guest={guest}
                fields={collarFields}
                facility={facilityInfo}
              />
            )}
          </div>
        ))}
      </div>

      <style>{`
        #kennel-print-area { display: none; }
        #kennel-print-area,
        #kennel-print-area * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #kennel-print-area[data-color-mode="bw"] { filter: grayscale(1); }
        @media print {
          body[data-kennel-printing] * { visibility: hidden; }
          body[data-kennel-printing] #kennel-print-area,
          body[data-kennel-printing] #kennel-print-area * { visibility: visible; }
          body[data-kennel-printing] #kennel-print-area {
            display: block !important;
            position: fixed;
            inset: 0;
            background: white;
            padding: 16px;
            z-index: 99999;
          }
          @page { margin: 8mm; }
        }
      `}</style>

      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[780px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="size-5" />
              Print Care Sheets
            </DialogTitle>
          </DialogHeader>

          {/* Format + scope row */}
          <div className="flex flex-wrap gap-6">
            <div className="space-y-2">
              <p className="text-sm font-medium">Format</p>
              <div className="flex gap-2">
                <button
                  data-active={format === "kennel"}
                  onClick={() => setFormat("kennel")}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border-2 px-3 py-2 text-sm transition-all data-[active=false]:border-border data-[active=false]:hover:bg-muted/50 data-[active=true]:border-primary data-[active=true]:bg-primary/5"
                >
                  <CreditCard className="size-4" />
                  Boarding Sheet
                </button>
                <button
                  data-active={format === "door"}
                  onClick={() => setFormat("door")}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border-2 px-3 py-2 text-sm transition-all data-[active=false]:border-border data-[active=false]:hover:bg-muted/50 data-[active=true]:border-primary data-[active=true]:bg-primary/5"
                >
                  <Tag className="size-4" />
                  Bin Label
                </button>
                <button
                  data-active={format === "collar"}
                  onClick={() => setFormat("collar")}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border-2 px-3 py-2 text-sm transition-all data-[active=false]:border-border data-[active=false]:hover:bg-muted/50 data-[active=true]:border-primary data-[active=true]:bg-primary/5"
                >
                  <Dog className="size-4" />
                  Collar Label
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Color</p>
              <div className="flex gap-2">
                <button
                  data-active={colorMode === "color"}
                  onClick={() => setColorMode("color")}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border-2 px-3 py-2 text-sm transition-all data-[active=false]:border-border data-[active=false]:hover:bg-muted/50 data-[active=true]:border-primary data-[active=true]:bg-primary/5"
                >
                  <Palette className="size-4" />
                  Color
                </button>
                <button
                  data-active={colorMode === "bw"}
                  onClick={() => setColorMode("bw")}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border-2 px-3 py-2 text-sm transition-all data-[active=false]:border-border data-[active=false]:hover:bg-muted/50 data-[active=true]:border-primary data-[active=true]:bg-primary/5"
                >
                  <Contrast className="size-4" />
                  B&W
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Print For</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  data-active={scope === "all"}
                  onClick={() => setScope("all")}
                  className="cursor-pointer rounded-lg border-2 px-3 py-2 text-sm transition-all data-[active=false]:border-border data-[active=false]:hover:bg-muted/50 data-[active=true]:border-primary data-[active=true]:bg-primary/5"
                >
                  All ({guests.length})
                </button>
                {guests.map((g) => (
                  <button
                    key={g.id}
                    data-active={scope === g.id}
                    onClick={() => setScope(g.id)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border-2 px-3 py-2 text-sm transition-all data-[active=false]:border-border data-[active=false]:hover:bg-muted/50 data-[active=true]:border-primary data-[active=true]:bg-primary/5"
                  >
                    <PawPrint className="size-3.5" />
                    {g.petName}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Customize section */}
          <div className="rounded-xl border">
            <button
              onClick={() => setShowCustomize((v) => !v)}
              className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <Settings className="size-4 text-muted-foreground" />
                {format === "collar"
                  ? "Fields to include"
                  : "Customize sections"}
              </span>
              {showCustomize ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </button>
            {showCustomize && (
              <div className="border-t px-4 pb-4 pt-3">
                {format === "collar" ? (
                  <CollarFieldsPanel
                    fields={collarFields}
                    onChange={setCollarFields}
                    facility={facilityInfo}
                    onFacilityChange={setFacilityInfo}
                  />
                ) : (
                  <CustomizePanel options={options} onChange={setOptions} />
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-auto rounded-xl border bg-gray-100 p-6">
            <div
              className="flex flex-col items-center gap-8"
              style={{
                filter: colorMode === "bw" ? "grayscale(1)" : undefined,
              }}
            >
              {guestsToRender.map((guest) => (
                <div key={guest.id} className="shadow-lg ring-1 ring-black/10">
                  {format === "kennel" ? (
                    <KennelCardTemplate guest={guest} options={options} />
                  ) : format === "door" ? (
                    <DoorCardTemplate guest={guest} options={options} />
                  ) : (
                    <CollarLabelTemplate
                guest={guest}
                fields={collarFields}
                facility={facilityInfo}
              />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handlePrint}>
              <Printer className="mr-2 size-4" />
              Print{" "}
              {guestsToRender.length > 1
                ? `${guestsToRender.length} ${format === "collar" ? "Labels" : "Cards"}`
                : format === "collar"
                  ? "Label"
                  : "Card"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
