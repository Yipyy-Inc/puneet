"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, ShieldCheck } from "lucide-react";

import { useAppLocale } from "@/hooks/use-app-locale";
import { useClientDocuments } from "@/lib/api/client-documents";
import type { ClientDocumentFile } from "@/lib/api/mappers/client-document";
import type { Vaccination } from "@/lib/api/mappers/vaccination";
import { vaccinationQueries } from "@/lib/api/vaccinations";
import { formatCalendarDayLong } from "@/lib/i18n/format";
import { NO_ITEMS } from "@/lib/no-items";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// What the desk needs to know about a booking's pet before it arrives: the
// vaccinations on file, and the papers on the owner's record.
//
// ── WHY IT IS HERE ────────────────────────────────────────────────────────
//
// The calendar's drawer showed neither. Its own helpers once looked both up in
// `src/data` fixtures by numeric id — which is how a real pet wore another
// pet's rabies certificate — and those lookups were deleted on 2026-09-15
// rather than replaced. This reads the rows the pet profile and the client file
// read: `pet_vaccinations` and `client_documents`.
//
// It states what it knows. "No records on file" is not "up to date", and a
// record with no expiry is shown as having none rather than called current.
// ============================================================================

/** Expired, expiring within 30 days, or neither. Dates only — nothing invented. */
function expiryState(expiresOn: string | null | undefined) {
  if (!expiresOn) return "unknown" as const;
  const days = Math.ceil(
    (new Date(`${expiresOn}T00:00:00`).getTime() - Date.now()) / 86_400_000,
  );
  if (days < 0) return "expired" as const;
  if (days <= 30) return "soon" as const;
  return "current" as const;
}

function VaccinationRow({ record }: { record: Vaccination }) {
  const { t } = useStaffText("bookingReadiness");
  const locale = useAppLocale();
  const state = expiryState(record.expiryDate);
  const word = t(
    state === "expired"
      ? "expired"
      : state === "soon"
        ? "expiringSoon"
        : state === "unknown"
          ? "noExpiry"
          : "onFile",
  );
  // §3: the word carries the state, and the ink is a second channel, never the
  // only one. Dot-weight colours are not text, so these are the word inks.
  const ink =
    state === "expired"
      ? "text-error"
      : state === "soon"
        ? "text-warning"
        : "text-ink-tertiary";

  return (
    <li className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-foreground truncate text-[14.5px]">
        {record.vaccineName}
      </span>
      <span className={`shrink-0 text-[13.5px] ${ink}`}>
        {word}
        {record.expiryDate
          ? ` · ${formatCalendarDayLong(record.expiryDate, locale)}`
          : ""}
      </span>
    </li>
  );
}

export function BookingReadinessSection({
  petRef,
  clientRef,
  petName,
}: {
  petRef: number;
  clientRef: number;
  petName: string;
}) {
  const { t, fill } = useStaffText("bookingReadiness");
  // The document TYPES are the client file's own words, so a type reads the
  // same here as it does where it was filed.
  const documentText = useStaffText("clientDocuments");
  const { data: vaccinationData, isPending: vaccinationsPending } = useQuery({
    ...vaccinationQueries.scoped({ kind: "pet", ref: petRef }),
    enabled: petRef > 0,
  });
  const vaccinations = (vaccinationData ?? NO_ITEMS) as Vaccination[];
  const { documents, pending: documentsPending } = useClientDocuments(
    clientRef,
  ) as { documents: ClientDocumentFile[]; pending: boolean };

  if (petRef <= 0 && clientRef <= 0) return null;

  return (
    <div className="space-y-4">
      <section className="space-y-1.5">
        <h3 className="text-ink-secondary flex items-center gap-1.5 text-[13.5px] font-bold">
          <ShieldCheck className="size-3.5" />
          {t("vaccinations")}
        </h3>
        {vaccinationsPending ? (
          <p className="text-ink-tertiary text-[13.5px]">{t("loading")}</p>
        ) : vaccinations.length === 0 ? (
          <p className="text-ink-tertiary text-[13.5px]">
            {fill("noVaccinations", { pet: petName })}
          </p>
        ) : (
          <ul className="divide-line divide-y">
            {vaccinations.map((record) => (
              <VaccinationRow key={record.id} record={record} />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-1.5">
        <h3 className="text-ink-secondary flex items-center gap-1.5 text-[13.5px] font-bold">
          <FileText className="size-3.5" />
          {t("documents")}
        </h3>
        {documentsPending ? (
          <p className="text-ink-tertiary text-[13.5px]">{t("loading")}</p>
        ) : documents.length === 0 ? (
          <p className="text-ink-tertiary text-[13.5px]">{t("noDocuments")}</p>
        ) : (
          <ul className="divide-line divide-y">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-baseline justify-between gap-3 py-1"
              >
                <span className="text-foreground truncate text-[14.5px]">
                  {doc.name}
                </span>
                <span className="text-ink-tertiary shrink-0 text-[13.5px]">
                  {documentText.t(`type_${doc.type}`)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
