"use client";

import { useId } from "react";
import Link from "next/link";
import { Receipt } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTaxConfig } from "@/lib/api/facility-settings";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { useSettingsHref } from "@/lib/settings/use-settings-href";

// ============================================================================
// "CHARGE TAX ON THIS SERVICE" — the same control in all four rate editors.
//
// Asked for by the client on 2026-09-21, about the daycare rate dialog: "Then
// choose taxes if they want to skip taxes for any service we can unselect
// taxes." The facility's tax config was all-or-nothing for the whole business,
// so a facility charging GST charged it on everything it sold.
//
// ── ONE COMPONENT, BECAUSE THE ANSWER MUST NOT DEPEND ON THE SCREEN ───────
//
// Boarding, daycare, grooming and training each have their own editor, written
// at different times, and a per-screen copy of this switch is four chances to
// default it the wrong way round. The safe default — taxed — is written once,
// here and in lib/payments/service-tax.ts, and every editor spends it.
//
// ── IT SAYS WHEN IT WOULD DECIDE NOTHING ──────────────────────────────────
//
// A facility that has set no taxes is charged none (see lib/settings/tax.ts:
// the fallback is deliberately empty, so nobody starts collecting 14.975% by
// inheriting a fixture). Offering them "charge tax on this service" would be a
// switch that changes nothing — the same defect `check:inert-permissions`
// exists to catch in the role editor. So when there is no tax to charge, this
// says so and points at the screen that would fix it, instead of pretending
// the choice matters.
// ============================================================================

export function ServiceTaxToggle({
  taxable,
  onChange,
  disabled,
}: {
  /** Undefined means never set, which means taxed. */
  taxable: boolean | undefined;
  onChange: (taxable: boolean) => void;
  disabled?: boolean;
}) {
  const { t } = useStaffText("serviceTax");
  const { chargesAnything, isPending } = useTaxConfig();
  // Derived from the pathname, never written out. Every one of these editors is
  // re-exported by the employee shell, and a hardcoded /facility/dashboard link
  // there fails a groomer's portal guard and lands them on their shift
  // schedule — a 200, with no error, from a link that said "Set up taxes".
  // `check:settings-routes` caught exactly that here.
  const settingsPath = useSettingsHref();
  const settingsHref = settingsPath("taxes");
  // Generated rather than literal: a grooming editor showing a list of
  // services renders one of these per row, and a repeated id silently breaks
  // every label/control pairing after the first.
  const id = useId();

  // Absent is taxed, in the UI exactly as in the schema — a rate saved before
  // this field existed must show the switch ON, because that is what it does.
  const checked = taxable !== false;

  return (
    <div className="space-y-2">
      <div className="flex min-h-10 items-center justify-between gap-3 max-lg:min-h-12">
        <Label htmlFor={id} className="flex items-center gap-1.5 font-medium">
          <Receipt className="text-ink-tertiary size-4" />
          {t("label")}
        </Label>
        <Switch
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={onChange}
        />
      </div>

      {/* Nothing is claimed while the facility's taxes are still loading — a
          notice that says "you have no taxes" and then disappears is worse
          than a beat of silence. */}
      {!isPending &&
        (chargesAnything ? (
          <p className="text-ink-tertiary text-[13.5px]">
            {checked ? t("onHelp") : t("offHelp")}
          </p>
        ) : (
          <p className="text-ink-tertiary text-[13.5px]">
            {t("noTaxes")}{" "}
            <Link href={settingsHref} className="text-primary underline">
              {t("noTaxesLink")}
            </Link>
          </p>
        ))}
    </div>
  );
}
