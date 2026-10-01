"use client";

import { Pill, Utensils } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SaveBar } from "@/components/ui/save-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AppLocale } from "@/lib/language-settings";
import type { CareService } from "@/lib/settings/care-setup";
import type { FeedingInstructions } from "@/lib/settings/feeding-instructions";
import type { MedicationInstructions } from "@/lib/settings/medication-instructions";

import { FEEDING_SECTIONS, FeedingTab } from "./feeding-tab";
import { MEDICATION_SECTIONS, MedicationsTab } from "./medications-tab";
import { useCareSetup, type SetupTab } from "./use-care-setup";

// ============================================================================
// SETTINGS › SERVICES › FEEDING & MEDICATIONS — the client's page, laid out as
// its design lays it out: a line saying what the page is for, with "Reset all
// …" while the open tab differs from its defaults; two tabs; a row of jump
// links that stays in view; the cards; one save bar for the page.
//
// The tabs carry glyphs where the design has coloured dots — an orange dot is
// orange as a state, which §2b bans in settings. The tab strip is the
// sanctioned one (§6 rule 1): an open rail, a 2px line under its own label.
// ============================================================================

const JUMPS: Record<SetupTab, { id: string; key: string }[]> = {
  feeding: [
    { id: "f-services", key: "jumpServices" },
    { id: "f-times", key: "jumpMealTimes" },
    { id: "f-types", key: "jumpFoodTypes" },
    { id: "f-house", key: "jumpHouseFood" },
    { id: "f-packing", key: "jumpPacking" },
    { id: "f-options", key: "jumpFeedingOptions" },
    { id: "f-more", key: "jumpMore" },
  ],
  medications: [
    { id: "m-services", key: "jumpServices" },
    { id: "m-forms", key: "jumpForms" },
    { id: "m-fees", key: "jumpFees" },
    { id: "m-times", key: "jumpDoseTimes" },
    { id: "m-methods", key: "jumpMethods" },
    { id: "m-rules", key: "jumpRules" },
    { id: "m-more", key: "jumpMore" },
  ],
};

const FEEDING_KEYS = Object.values(FEEDING_SECTIONS).flat();
const MEDICATION_KEYS = Object.values(MEDICATION_SECTIONS).flat();

export function CareSetupPage({
  initial,
  others,
  t,
  bt,
  locale,
}: {
  initial: {
    feeding: FeedingInstructions;
    medications: MedicationInstructions;
  };
  /** Grooming and training, while their module is on. */
  others: CareService[];
  t: (key: string) => string;
  bt: (key: string) => string;
  locale: AppLocale;
}) {
  const setup = useCareSetup(initial, t);
  const feeding = setup.tab === "feeding";
  const tabChanged = feeding
    ? setup.feedingChanged(FEEDING_KEYS)
    : setup.medicationsChanged(MEDICATION_KEYS);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-body text-ink-secondary max-w-160 min-w-0 text-pretty">
          {t("intro")}
        </p>
        {tabChanged ? (
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              feeding
                ? setup.resetFeeding(FEEDING_KEYS)
                : setup.resetMedications(MEDICATION_KEYS)
            }
          >
            {t(feeding ? "resetAllFeeding" : "resetAllMedications")}
          </Button>
        ) : null}
      </div>

      <Tabs
        value={setup.tab}
        onValueChange={(value) => setup.setTab(value as SetupTab)}
        className="gap-4"
      >
        <div className="border-line border-b">
          <TabsList aria-label={t("tabsLabel")} className="gap-0 px-0">
            <TabsTrigger value="feeding" className="border-transparent">
              <Utensils aria-hidden />
              {t("tabFeeding")}
            </TabsTrigger>
            <TabsTrigger value="medications" className="border-transparent">
              <Pill aria-hidden />
              {t("tabMedications")}
            </TabsTrigger>
          </TabsList>
        </div>

        <nav
          aria-label={t("jumpLabel")}
          className="bg-background sticky top-16 z-(--z-sticky) -my-2 flex min-w-0 gap-1.5 overflow-x-auto py-2"
        >
          {JUMPS[setup.tab].map((jump) => (
            <a
              key={jump.id}
              href={`#${jump.id}`}
              className="border-line bg-card text-meta text-ink-secondary hover:border-line-strong hover:text-body-ink focus-visible:outline-primary inline-flex min-h-10 shrink-0 items-center rounded-full border px-3.5 font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 max-lg:min-h-12"
            >
              {t(jump.key)}
            </a>
          ))}
        </nav>

        <TabsContent value="feeding">
          <FeedingTab
            setup={setup}
            others={others}
            t={t}
            bt={bt}
            locale={locale}
          />
        </TabsContent>
        <TabsContent value="medications">
          <MedicationsTab
            setup={setup}
            others={others}
            t={t}
            bt={bt}
            locale={locale}
          />
        </TabsContent>
      </Tabs>

      {/* As the design has it: there while something is unsaved, and only then. */}
      {setup.dirty || setup.saving ? (
        <SaveBar
          placement="page"
          dirty={setup.dirty}
          saving={setup.saving}
          onSave={setup.save}
          onReset={setup.discard}
        />
      ) : null}
    </div>
  );
}
