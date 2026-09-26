"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { useBoardingServices } from "@/lib/api/boarding-catalogue";
import { useDaycareServices } from "@/lib/api/daycare-catalogue";
import { useGroomingServices } from "@/lib/api/grooming-catalogue";
import { useCustomServices } from "@/hooks/use-custom-services";

import type { AddOnDraft } from "./add-on-draft";
import { AddOnOptionCards } from "./add-on-option-cards";
import { AddOnSection } from "./add-on-section";

interface ServiceOption {
  ref: string;
  label: string;
}

interface ServiceGroup {
  key: string;
  title: string;
  options: ServiceOption[];
}

/**
 * Applicable services — "All services (including future ones)", or the
 * services chosen here, grouped by what they are. A choice is stored as a
 * reference to the service row (`boarding:<uuid>`), so renaming a service
 * keeps the add-on on it; training and a custom module are chosen whole.
 */
export function AddOnServices({
  index,
  draft,
  patch,
  t,
}: {
  index: number;
  draft: AddOnDraft;
  patch: (next: Partial<AddOnDraft>) => void;
  t: (key: string) => string;
}) {
  const specific = !draft.appliesToAllServices;
  // The lists load only once somebody chooses to pick from them.
  const boarding = useBoardingServices(null, { enabled: specific });
  const daycare = useDaycareServices(null, { enabled: specific });
  const grooming = useGroomingServices();
  const { activeModules } = useCustomServices();

  const groups: ServiceGroup[] = [
    {
      key: "boarding",
      title: t("svcBoarding"),
      options: (boarding.data ?? []).map((s) => ({
        ref: `boarding:${s.rowId}`,
        label: s.name,
      })),
    },
    {
      key: "daycare",
      title: t("svcDaycare"),
      options: (daycare.data ?? []).map((s) => ({
        ref: `daycare:${s.rowId}`,
        label: s.name,
      })),
    },
    {
      key: "grooming",
      title: t("svcGrooming"),
      options: (grooming.data ?? []).flatMap((s) =>
        s.rowId ? [{ ref: `grooming:${s.rowId}`, label: s.name }] : [],
      ),
    },
    {
      key: "other",
      title: t("svcOther"),
      options: [
        {
          ref: "training",
          label: t("svcAllOfModule").replace("{module}", t("svcTraining")),
        },
        {
          ref: "evaluation",
          label: t("svcAllOfModule").replace("{module}", t("svcEvaluation")),
        },
        ...activeModules.map((m) => ({
          ref: `custom:${m.slug}`,
          label: t("svcAllOfModule").replace("{module}", m.name),
        })),
      ],
    },
  ];

  const toggle = (ref: string) =>
    patch({
      serviceRefs: draft.serviceRefs.includes(ref)
        ? draft.serviceRefs.filter((r) => r !== ref)
        : [...draft.serviceRefs, ref],
    });

  return (
    <AddOnSection index={index} title={t("secServices")}>
      <AddOnOptionCards
        label={t("secServices")}
        value={specific ? "specific" : "all"}
        onChange={(value) => patch({ appliesToAllServices: value === "all" })}
        options={[
          {
            value: "all",
            title: t("scopeAllFuture"),
            hint: t("scopeAllFutureHelp"),
          },
          {
            value: "specific",
            title: t("scopeSelect"),
            hint: t("scopeSelectHelp"),
          },
        ]}
      />

      {specific ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <fieldset key={group.key} className="space-y-1">
              <legend className="text-[12px] font-bold tracking-[.06em] text-(--ink-tertiary) uppercase">
                {group.title}
              </legend>
              {group.options.length === 0 ? (
                <p className="text-muted-foreground text-[13.5px]">
                  {t("noServicesYet")}
                </p>
              ) : (
                group.options.map((option) => (
                  <label
                    key={option.ref}
                    className="flex min-h-10 items-center gap-3 max-lg:min-h-12"
                  >
                    <Checkbox
                      checked={draft.serviceRefs.includes(option.ref)}
                      onCheckedChange={() => toggle(option.ref)}
                    />
                    <span className="min-w-0 text-[14.5px]">
                      {option.label}
                    </span>
                  </label>
                ))
              )}
            </fieldset>
          ))}
        </div>
      ) : null}
    </AddOnSection>
  );
}
