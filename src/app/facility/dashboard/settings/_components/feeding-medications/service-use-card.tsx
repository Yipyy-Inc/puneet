"use client";

import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { fill } from "@/lib/medications/dose";
import type {
  CareService,
  CareServices,
  CareStepUse,
} from "@/lib/settings/care-setup";

import { SetupCard, SetupRow } from "./setup-card";

// ============================================================================
// WHERE IT APPEARS: per service, the step left out, optional, or required.
// Boarding and daycare first; then the facility's other services, off until
// it turns them on — listed only while their module is on.
// ============================================================================

interface ServiceRow {
  service: CareService;
  name: string;
  sub: string;
}

function Row({
  row,
  use,
  onChange,
  t,
}: {
  row: ServiceRow;
  use: CareStepUse;
  onChange: (use: CareStepUse) => void;
  t: (key: string) => string;
}) {
  const on = use !== "disabled";
  return (
    <SetupRow className="justify-between">
      <label className="flex min-w-0 cursor-pointer items-center gap-3.5">
        <Switch
          checked={on}
          onCheckedChange={(checked) =>
            onChange(checked ? "optional" : "disabled")
          }
          aria-label={fill(t("serviceSwitch"), { service: row.name })}
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-body-ink text-[15px] font-medium">
            {row.name}
          </span>
          <span className="text-ink-tertiary text-[13px]">{row.sub}</span>
        </span>
      </label>
      {on ? (
        <Segmented
          name={`use-${row.service}`}
          label={fill(t("serviceUse"), { service: row.name })}
          value={use === "required" ? "required" : "optional"}
          options={[
            { value: "optional", label: t("useOptional") },
            { value: "required", label: t("useRequired") },
          ]}
          onChange={(value) => onChange(value)}
        />
      ) : null}
    </SetupRow>
  );
}

export function ServiceUseCard({
  id,
  title,
  help,
  services,
  others,
  onChange,
  changed,
  onReset,
  t,
}: {
  id: string;
  title: string;
  help: string;
  services: CareServices;
  /** The facility's other services whose module is on. */
  others: CareService[];
  onChange: (services: CareServices) => void;
  changed: boolean;
  onReset: () => void;
  t: (key: string) => string;
}) {
  const main: ServiceRow[] = [
    { service: "boarding", name: t("svcBoarding"), sub: t("svcBoardingSub") },
    { service: "daycare", name: t("svcDaycare"), sub: t("svcDaycareSub") },
  ];
  const other: ServiceRow[] = (
    [
      { service: "grooming", name: t("svcGrooming"), sub: t("svcOtherSub") },
      { service: "training", name: t("svcTraining"), sub: t("svcOtherSub") },
    ] as ServiceRow[]
  ).filter((row) => others.includes(row.service));
  const set = (service: CareService) => (use: CareStepUse) =>
    onChange({ ...services, [service]: use });

  return (
    <SetupCard
      id={id}
      title={title}
      help={help}
      changed={changed}
      changedNote={t("changedNote")}
      resetLabel={t("resetSection")}
      onReset={onReset}
    >
      <div className="flex flex-col">
        {main.map((row) => (
          <Row
            key={row.service}
            row={row}
            use={services[row.service]}
            onChange={set(row.service)}
            t={t}
          />
        ))}
      </div>
      {other.length > 0 ? (
        <>
          <div className="bg-surface-inset flex flex-col gap-0.5 border-t border-(--inset-2) px-5 pt-3.5 pb-1.5 sm:px-6">
            <span className="text-[12px] font-semibold tracking-[0.08em] text-(--care-micro) uppercase">
              {t("otherServicesTitle")}
            </span>
            <span className="text-ink-tertiary text-[13px]">
              {t("otherServicesHelp")}
            </span>
          </div>
          <div className="bg-surface-inset flex flex-col">
            {other.map((row) => (
              <Row
                key={row.service}
                row={row}
                use={services[row.service]}
                onChange={set(row.service)}
                t={t}
              />
            ))}
          </div>
        </>
      ) : null}
    </SetupCard>
  );
}
