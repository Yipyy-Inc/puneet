"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { GroomingAppointment } from "@/types/grooming";
import { getEffectiveAlertNotes } from "@/lib/api/grooming";
import { clients } from "@/data/clients";
import { petNotes } from "@/data/pet-notes";
import { vaccinationRecords } from "@/data/pet-data";

function formatDateLong(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2 border-b border-gray-300 py-1">
      <span className="w-28 shrink-0 text-[10px] uppercase tracking-wide text-gray-600">
        {label}
      </span>
      <span className="text-[12px] text-black">{value}</span>
    </div>
  );
}

/**
 * Comprehensive one-card-per-page print layout. Each appointment card
 * gathers pet, client, service, alerts, comments, vaccinations, vet, and
 * previous-visit history into a single physical record. A QR code on the
 * card links to the pet profile so groomers can pull up the full digital
 * history mid-appointment without typing anything.
 */
export function PrintableAppointmentCards({
  date,
  appointments,
  allAppointments,
  active = true,
}: {
  date: string;
  /** Appointments to print cards for (post-filter from the calendar). */
  appointments: GroomingAppointment[];
  /** Full list — used for alert carry-forward + previous-visit count. */
  allAppointments: GroomingAppointment[];
  /** Toggle to suppress this layout when the day-summary picker is active. */
  active?: boolean;
}) {
  const dayAppointments = appointments
    .filter(
      (a) =>
        a.date === date && a.status !== "cancelled" && a.status !== "no-show",
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!active) return null;

  return (
    <div className="hidden print:block bg-white text-black">
      {dayAppointments.map((apt, idx) => (
        <AppointmentCard
          key={apt.id}
          appointment={apt}
          allAppointments={allAppointments}
          origin={origin}
          // Force each card onto its own physical page. The last card omits
          // the break so we don't end on a blank page.
          forcePageBreak={idx < dayAppointments.length - 1}
        />
      ))}
      {dayAppointments.length === 0 && (
        <p className="text-sm italic text-gray-600">
          No appointments scheduled for {formatDateLong(date)}.
        </p>
      )}
    </div>
  );
}

function AppointmentCard({
  appointment,
  allAppointments,
  origin,
  forcePageBreak,
}: {
  appointment: GroomingAppointment;
  allAppointments: GroomingAppointment[];
  origin: string;
  forcePageBreak: boolean;
}) {
  // Resolve owner + pet from clients data; tolerate missing data without
  // crashing the print layout.
  const client = clients.find((c) => c.id === appointment.ownerId);
  const pet = client?.pets.find((p) => p.id === appointment.petId);

  const effectiveAlerts = useMemo(
    () => getEffectiveAlertNotes(appointment, allAppointments),
    [appointment, allAppointments],
  );

  // Previous grooming appointments for this pet (excluding the current one).
  // Groomers reading the printed card want both the count and "who did them"
  // so they can match the prior style or call out a continuity issue.
  const previousVisits = useMemo(() => {
    const past = allAppointments
      .filter(
        (a) =>
          a.petId === appointment.petId &&
          a.id !== appointment.id &&
          a.status === "completed",
      )
      .sort((a, b) => b.date.localeCompare(a.date));
    const groomers = past.reduce<Record<string, number>>((acc, a) => {
      acc[a.stylistName] = (acc[a.stylistName] ?? 0) + 1;
      return acc;
    }, {});
    return { total: past.length, groomers, mostRecent: past[0] };
  }, [appointment, allAppointments]);

  const petProfileNotes = useMemo(
    () =>
      petNotes
        .filter((n) => n.scope === "pet" && n.petId === appointment.petId)
        .sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return b.createdAt.localeCompare(a.createdAt);
        }),
    [appointment],
  );
  const clientProfileNotes = useMemo(
    () =>
      petNotes.filter(
        (n) => n.scope === "client" && n.clientId === appointment.ownerId,
      ),
    [appointment],
  );

  // Vaccination status for the pet — flag expired or expiring soon.
  const vaccinations = useMemo(() => {
    const recs = vaccinationRecords.filter(
      (v) => v.petId === appointment.petId,
    );
    const now = Date.now();
    const status = recs.length === 0
      ? "Unknown"
      : recs.every((v) => new Date(v.expiryDate).getTime() > now)
        ? "Up to date"
        : "Expired";
    return { recs, status };
  }, [appointment.petId]);

  const qrUrl =
    origin &&
    `${origin}/facility/dashboard/clients/${appointment.ownerId}/pets/${appointment.petId}`;

  return (
    <article
      className="mx-auto flex max-w-[7.5in] flex-col gap-3 p-6"
      style={
        forcePageBreak
          ? { pageBreakAfter: "always" }
          : undefined
      }
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-2">
        <div className="flex items-start gap-3">
          {/* Pet photo */}
          {pet?.imageUrl || appointment.petPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pet?.imageUrl ?? appointment.petPhotoUrl}
              alt={appointment.petName}
              className="size-20 rounded-md border border-gray-400 object-cover"
            />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-md border border-gray-400 text-2xl font-bold text-gray-500">
              {appointment.petName.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold leading-tight">
              {appointment.petName}
              <span className="ml-2 text-base font-normal text-gray-600">
                {appointment.petBreed}
              </span>
            </h1>
            <p className="text-sm">
              {formatDateLong(appointment.date)} ·{" "}
              <strong>{appointment.startTime}–{appointment.endTime}</strong>
            </p>
            <p className="text-xs text-gray-600">
              Groomer: <strong>{appointment.stylistName}</strong> · Service:{" "}
              <strong>{appointment.packageName}</strong>
            </p>
          </div>
        </div>

        {/* QR code — links to the pet profile so groomers can pull the full
            digital record on their phone without typing. */}
        <div className="flex flex-col items-center gap-1">
          {qrUrl && (
            <QRCodeSVG
              value={qrUrl}
              size={88}
              level="M"
              includeMargin={false}
            />
          )}
          <span className="text-[9px] uppercase tracking-wide text-gray-500">
            Scan → pet profile
          </span>
        </div>
      </header>

      {/* Critical alerts — top of card, bordered for legibility */}
      {effectiveAlerts.length > 0 && (
        <section className="rounded-md border-2 border-black bg-gray-100 px-3 py-2">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider">
            ⚠ Alerts · {effectiveAlerts.length}
          </p>
          <ul className="space-y-0.5 text-[12px]">
            {effectiveAlerts.map((n) => (
              <li key={n.id}>
                • {n.text}
                {n.carriedFromAppointmentId && (
                  <span className="ml-1 text-[10px] text-gray-600">
                    (carried from prior visit)
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Two-column body */}
      <div className="grid grid-cols-2 gap-x-6">
        {/* Pet column */}
        <div>
          <h2 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-700">
            Pet
          </h2>
          <FieldRow label="Pet code" value={`#${appointment.petId}`} />
          <FieldRow label="Sex" value={pet?.sex ?? "—"} />
          <FieldRow
            label="Age"
            value={pet?.age !== undefined ? `${pet.age} yr` : "—"}
          />
          <FieldRow label="Weight" value={`${appointment.petWeight} lbs`} />
          <FieldRow label="Coat" value={appointment.coatType} />
          <FieldRow label="Size" value={appointment.petSize} />
          <FieldRow label="Microchip" value={pet?.microchip ?? "—"} />
          <FieldRow
            label="Vaccinations"
            value={
              <>
                {vaccinations.status}
                {vaccinations.recs.length > 0 && (
                  <span className="ml-1 text-[10px] text-gray-600">
                    ({vaccinations.recs.length} on file)
                  </span>
                )}
              </>
            }
          />
          <FieldRow
            label="Health issues"
            value={
              pet?.specialNeeds && pet.specialNeeds !== "None"
                ? pet.specialNeeds
                : "—"
            }
          />
          <FieldRow
            label="Vet name"
            value={pet?.specialNeeds ? "On file" : "—"}
          />
          <FieldRow label="Vet phone" value="—" />
        </div>

        {/* Client column */}
        <div>
          <h2 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-700">
            Client
          </h2>
          <FieldRow label="Name" value={appointment.ownerName} />
          <FieldRow label="Phone" value={appointment.ownerPhone} />
          <FieldRow label="Email" value={appointment.ownerEmail} />
          <FieldRow
            label="Client tag"
            value={
              client?.status ? (
                <span className="capitalize">{client.status}</span>
              ) : (
                "—"
              )
            }
          />
          <FieldRow
            label="Agreement"
            value={pet?.evaluations?.[0]?.status ?? "—"}
          />
          <FieldRow
            label="Previous visits"
            value={
              previousVisits.total > 0 ? (
                <>
                  <strong>{previousVisits.total}</strong>
                  {previousVisits.mostRecent && (
                    <span className="ml-1 text-[10px] text-gray-600">
                      last: {formatShortDate(previousVisits.mostRecent.date)}
                    </span>
                  )}
                </>
              ) : (
                "First visit"
              )
            }
          />
          <FieldRow
            label="Previous groomers"
            value={
              Object.keys(previousVisits.groomers).length > 0
                ? Object.entries(previousVisits.groomers)
                    .map(([name, n]) => `${name} ×${n}`)
                    .join(", ")
                : "—"
            }
          />
        </div>
      </div>

      {/* Service + price */}
      <section className="rounded-md border border-black px-3 py-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-700">
              Service
            </p>
            <p className="text-sm font-semibold">
              {appointment.packageName}
              {appointment.addOns.length > 0 && (
                <span className="text-[11px] font-normal text-gray-700">
                  {" "}
                  + {appointment.addOns.join(", ")}
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-gray-600">
              Total
            </p>
            <p className="text-lg font-bold tabular-nums">
              ${appointment.totalPrice}
            </p>
          </div>
        </div>
        {/* Service completion checkbox — groomers physically tick this off
            once the appointment is done. */}
        <div className="mt-2 flex items-center gap-2 border-t border-gray-300 pt-1.5">
          <span className="inline-block size-4 border-2 border-black" />
          <span className="text-[11px] font-semibold">
            Service complete — groomer initial: ___________
          </span>
        </div>
      </section>

      {/* Pet notes */}
      {petProfileNotes.length > 0 && (
        <section>
          <h2 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-700">
            Pet notes
          </h2>
          <ul className="space-y-0.5 text-[11px]">
            {petProfileNotes.map((n) => (
              <li key={n.id}>
                {n.pinned && <strong>📌 </strong>}
                {n.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Client notes */}
      {clientProfileNotes.length > 0 && (
        <section>
          <h2 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-700">
            Client notes
          </h2>
          <ul className="space-y-0.5 text-[11px]">
            {clientProfileNotes.map((n) => (
              <li key={n.id}>{n.text}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Ticket comments */}
      {(appointment.ticketComments?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-700">
            Ticket comments
          </h2>
          <ul className="space-y-0.5 text-[11px]">
            {appointment.ticketComments!.map((c) => (
              <li key={c.id}>
                <strong>{c.staff}:</strong> {c.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-400 pt-1 text-[9px] text-gray-500">
        Appointment #{appointment.id} · Printed for {appointment.stylistName} ·
        Scan QR for full digital record
      </footer>
    </article>
  );
}
