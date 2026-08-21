"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import {
  ProgramBasicsStep,
  type ProgramBasics,
} from "@/components/loyalty/setup/ProgramBasicsStep";
import { EarnRulesWizardStep } from "@/components/loyalty/setup/EarnRulesWizardStep";
import { TiersWizardStep } from "@/components/loyalty/setup/TiersWizardStep";
import { BadgesWizardStep } from "@/components/loyalty/setup/BadgesWizardStep";
import { ReviewPublishStep } from "@/components/loyalty/setup/ReviewPublishStep";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import { facilities } from "@/data/facilities";
import { notifyCustomersOfLoyaltyLaunch } from "@/lib/loyalty/publish";
import {
  getActiveEarnRules,
  reconcileEarnRules,
} from "@/lib/loyalty/earn-rule-versioning";
import type { EarnRule, Tier, Badge } from "@/types/loyalty";

const STEPS = [
  {
    n: 1,
    title: "Program basics",
    desc: "Name, tagline, color & icon",
    tab: null,
  },
  {
    n: 2,
    title: "Earning",
    desc: "How customers earn",
    tab: "/facility/dashboard/loyalty/earn-rules",
  },
  {
    n: 3,
    title: "Tiers",
    desc: "Membership levels",
    tab: "/facility/dashboard/loyalty/tiers",
  },
  {
    n: 4,
    title: "Rewards & referrals",
    desc: "What members get",
    tab: "/facility/dashboard/loyalty/rewards",
  },
  {
    n: 5,
    title: "Review & launch",
    desc: "Confirm and go live",
    tab: "/facility/dashboard/loyalty",
  },
];

/**
 * The wizard proper, mounted only once the programme has been READ.
 *
 * Its steps seed themselves from the stored config in `useState` initialisers,
 * which is the right shape for a wizard — a draft that jumped under the user
 * mid-edit would be worse than one that starts late. But an initialiser runs on
 * the first render, and the programme now arrives from a request, so the seeds
 * would be the empty fallback: a facility editing its live programme would find
 * every step blank, and "Save changes" would write that.
 *
 * Gating the MOUNT is what makes seeding safe again. See the default export.
 */
function SetupWizard() {
  const router = useRouter();
  const { config, patchConfig, facilityId, isSaving } = useLoyaltyProgram();

  const facilityName = useMemo(
    () => facilities.find((f) => f.id === facilityId)?.name ?? "Your Facility",
    [facilityId],
  );

  const [step, setStep] = useState(1);
  const [basics, setBasics] = useState<ProgramBasics>(() => ({
    programName: config.programName || `${facilityName} Rewards`,
    tagline: config.programDescription || "",
    primaryColor: config.primaryColor || "#6366F1",
    programIcon: config.programIcon || "🐾",
  }));
  const [earnRules, setEarnRules] = useState<EarnRule[]>(() =>
    getActiveEarnRules(config.earnRules ?? []),
  );
  const [tiers, setTiers] = useState<Tier[]>(
    () => config.tierDefinitions ?? [],
  );
  const [tiersEnabled, setTiersEnabled] = useState<boolean>(
    () => config.tiersEnabled ?? true,
  );
  const [badges, setBadges] = useState<Badge[]>(() => config.badges ?? []);

  // Editing an already-live program (Manage Settings): keep it published and
  // skip the publish/notify flow. An unpublished draft still uses publish flow.
  const editMode = config.enabled === true;

  // Every save below is awaited and its failure reported. These write to
  // Postgres now, and RLS can refuse them — a wizard that announced "Tiers
  // saved" over a refusal and then advanced a step would lose the work twice.
  const handleSave = async (): Promise<boolean> => {
    try {
      if (step === 1) {
        await patchConfig({
          programName: basics.programName.trim() || undefined,
          programDescription: basics.tagline.trim() || undefined,
          primaryColor: basics.primaryColor,
          programIcon: basics.programIcon,
        });
        toast.success("Program basics saved");
      } else if (step === 2) {
        const reconciled = reconcileEarnRules(
          config.earnRules ?? [],
          earnRules,
        );
        await patchConfig({ earnRules: reconciled });
        setEarnRules(getActiveEarnRules(reconciled));
        toast.success("Earn rules saved");
      } else if (step === 3) {
        await patchConfig({ tierDefinitions: tiers, tiersEnabled });
        toast.success("Tiers saved");
      } else if (step === 4) {
        await patchConfig({ badges });
        toast.success("Badges saved");
      }
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "That step was not saved.",
      );
      return false;
    }
  };

  const handleContinue = async () => {
    if (step === 1 && basics.programName.trim().length === 0) {
      toast.error("Please name your program before continuing");
      return;
    }
    // Only advance on a save that actually landed.
    if (!(await handleSave())) return;
    if (step < STEPS.length) {
      setStep(step + 1);
    }
  };

  const persistProgram = async (enabled: boolean) => {
    const reconciledEarn = reconcileEarnRules(
      config.earnRules ?? [],
      earnRules,
    );
    await patchConfig({
      programName: basics.programName.trim() || undefined,
      programDescription: basics.tagline.trim() || undefined,
      primaryColor: basics.primaryColor,
      programIcon: basics.programIcon,
      earnRules: reconciledEarn,
      tierDefinitions: tiers,
      tiersEnabled,
      badges,
      enabled,
    });
    setEarnRules(getActiveEarnRules(reconciledEarn));
  };

  const handleSaveDraft = async () => {
    try {
      await persistProgram(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The draft was not saved.",
      );
      return;
    }
    toast.success("Saved as draft");
    router.push("/facility/dashboard/loyalty");
  };

  const handlePublish = async (): Promise<number> => {
    // The programme is published FIRST and customers are told second. The
    // reverse order would announce a launch that the database refused.
    await persistProgram(true);
    const count = notifyCustomersOfLoyaltyLaunch(
      facilityId,
      basics.programName.trim() || "Your rewards program",
    );
    toast.success("Program published");
    return count;
  };

  const handleSaveChanges = async () => {
    try {
      await persistProgram(config.enabled ?? false);
      toast.success("Changes saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The changes were not saved.",
      );
    }
  };

  const current = STEPS[step - 1];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-linear-to-br from-amber-500 to-orange-500">
            <Sparkles className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {editMode
                ? "Edit your loyalty program"
                : "Set up your loyalty program"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {editMode
                ? "Update any step — each saves independently."
                : "Five quick steps — most facilities finish in under 30 minutes."}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/facility/dashboard/loyalty">
            <ArrowLeft className="mr-1.5 size-4" /> Exit
          </Link>
        </Button>
      </div>

      {/* Stepper */}
      <div className="flex flex-wrap gap-2">
        {STEPS.map((s) => {
          const done = s.n < step;
          const active = s.n === step;
          return (
            <button
              key={s.n}
              type="button"
              onClick={() => setStep(s.n)}
              className={cn(
                "flex flex-1 items-center gap-2.5 rounded-lg border p-3 text-left transition-colors",
                active ? "border-primary bg-primary/5" : "hover:bg-muted/40",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  active
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" /> : s.n}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {s.title}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {s.desc}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Step heading */}
      <div>
        <p className="text-muted-foreground text-sm font-medium">
          Step {step} of {STEPS.length}
        </p>
        <h2 className="text-lg font-semibold">{current.title}</h2>
      </div>

      {/* Step content */}
      {step === 1 && <ProgramBasicsStep value={basics} onChange={setBasics} />}
      {step === 2 && (
        <EarnRulesWizardStep
          value={earnRules}
          onChange={setEarnRules}
          facilityId={facilityId}
        />
      )}
      {step === 3 && (
        <TiersWizardStep
          value={tiers}
          onChange={setTiers}
          enabled={tiersEnabled}
          onEnabledChange={setTiersEnabled}
          facilityId={facilityId}
        />
      )}
      {step === 4 && (
        <BadgesWizardStep value={badges} onChange={setBadges} tiers={tiers} />
      )}
      {step === 5 && (
        <ReviewPublishStep
          programName={basics.programName}
          tagline={basics.tagline}
          primaryColor={basics.primaryColor}
          programIcon={basics.programIcon}
          earnRules={earnRules}
          tiers={tiers}
          tiersEnabled={tiersEnabled}
          badges={badges}
          referralProgram={config.referralProgram}
          facilityId={facilityId}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublish}
          editMode={editMode}
          onSaveChanges={handleSaveChanges}
        />
      )}

      {/* Footer nav */}
      <div className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky bottom-0 -mx-6 flex items-center justify-between gap-2 border-t px-6 py-3 backdrop-blur-sm">
        <Button
          variant="ghost"
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
        >
          <ChevronLeft className="mr-1.5 size-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          {/* Both write to Postgres, so both stay disabled until the write
              lands — a second click would queue a second save of the same step
              and, on Continue, advance twice. */}
          {step <= 4 && (
            <Button
              variant="outline"
              onClick={() => void handleSave()}
              disabled={isSaving}
            >
              {isSaving ? "Saving…" : "Save"}
            </Button>
          )}
          {step < STEPS.length && (
            <Button onClick={() => void handleContinue()} disabled={isSaving}>
              Save &amp; Continue
              <ChevronRight className="ml-1.5 size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Waits for the programme, then mounts the wizard.
 *
 * The gate is the whole point — see the note on `SetupWizard`.
 */
export default function LoyaltySetupWizardPage() {
  const { isPending } = useLoyaltyProgram();

  if (isPending) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return <SetupWizard />;
}
