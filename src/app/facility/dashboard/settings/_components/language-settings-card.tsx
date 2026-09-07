"use client";

import { useSettings } from "@/hooks/use-settings";
import {
  CUSTOMER_LANGUAGE_OPTIONS,
  getCustomerLanguageLabel,
} from "@/lib/language-settings";
import { useSettingsText } from "@/lib/settings/use-settings-text";

import { SettingsBlock } from "@/components/ui/settings-block";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Languages } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LanguageSettingsCard() {
  const { languageSettings, updateLanguageSettings } = useSettings();
  const t = useSettingsText().section("language");

  /**
   * One whole sentence per branch, not fragments joined with " · ".
   *
   * The summary line below used to be built by concatenating six pieces —
   * "Current mode: ", the mode, " · Primary: ", the locale, and so on. §5q is
   * explicit that a sentence assembled from fragments cannot be translated:
   * French puts the qualifier on the other side and needs a non-breaking space
   * before its colon, and neither survives a join. The placeholders are filled
   * here so each locale owns its whole sentence.
   */
  const fill = (key: string, values: Record<string, string>) =>
    Object.entries(values).reduce(
      (text, [name, value]) => text.replace(`{${name}}`, value),
      t(key),
    );
  // french-ok: a language picker names each language in that language.
  const localeName = (code: string) => (code === "en" ? "English" : "Français");

  return (
    <SettingsBlock
      title={t("title")}
      description={t("intro")}
      data={languageSettings}
      onSave={updateLanguageSettings}
    >
      {(isEditing, localLanguageSettings, setLocalLanguageSettings) => (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-sky-100 bg-sky-50/60 p-3">
            <Languages className="mt-0.5 size-4 shrink-0 text-sky-600" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-sky-900">{t("modeHeading")}</p>
              <p className="text-sky-800/90">{t("modeHelp")}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
            <div className="space-y-2">
              <Label htmlFor="primary-language">{t("primaryLanguage")}</Label>
              <Select
                value={localLanguageSettings.primaryLocale}
                onValueChange={(value) => {
                  const nextPrimary = value as "en" | "fr";
                  const nextSecondary =
                    localLanguageSettings.secondaryLocale === nextPrimary
                      ? nextPrimary === "en"
                        ? "fr"
                        : "en"
                      : localLanguageSettings.secondaryLocale;

                  setLocalLanguageSettings({
                    ...localLanguageSettings,
                    primaryLocale: nextPrimary,
                    secondaryLocale: nextSecondary,
                  });
                }}
                disabled={!isEditing}
              >
                <SelectTrigger id="primary-language" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* french-ok: an endonym — a picker names each language in that language */}
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary-language">
                {t("secondaryLanguage")}
              </Label>
              <Select
                value={localLanguageSettings.secondaryLocale}
                onValueChange={(value) =>
                  setLocalLanguageSettings({
                    ...localLanguageSettings,
                    secondaryLocale: value as "en" | "fr",
                  })
                }
                disabled={!isEditing || !localLanguageSettings.secondaryEnabled}
              >
                <SelectTrigger id="secondary-language" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {localLanguageSettings.primaryLocale !== "en" && (
                    // french-ok: an endonym, as above
                    <SelectItem value="en">English</SelectItem>
                  )}
                  {localLanguageSettings.primaryLocale !== "fr" && (
                    <SelectItem value="fr">Français</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-[14.5px] font-medium">
                {t("enableSecondary")}
              </p>
              <p className="text-ink-tertiary text-[13.5px]">
                {t("enableSecondaryHelp")}
              </p>
            </div>
            <Switch
              checked={localLanguageSettings.secondaryEnabled}
              disabled={!isEditing}
              onCheckedChange={(checked) =>
                setLocalLanguageSettings({
                  ...localLanguageSettings,
                  secondaryEnabled: checked,
                })
              }
            />
          </div>

          <div className="space-y-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[14.5px] font-medium text-emerald-900">
                  {t("customerPreference")}
                </p>
                <p className="text-[13.5px] text-emerald-800/90">
                  {t("customerPreferenceHelp")}
                </p>
              </div>
              <Switch
                checked={
                  localLanguageSettings.customerLanguagePreferenceEnabled
                }
                disabled={!isEditing}
                onCheckedChange={(checked) =>
                  setLocalLanguageSettings({
                    ...localLanguageSettings,
                    customerLanguagePreferenceEnabled: checked,
                  })
                }
              />
            </div>

            {localLanguageSettings.customerLanguagePreferenceEnabled && (
              <div className="border-border space-y-2 border-t pt-3">
                <p className="text-[13.5px] font-medium text-emerald-900">
                  {t("availableToCustomers")}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CUSTOMER_LANGUAGE_OPTIONS.map((option) => {
                    const checked =
                      localLanguageSettings.customerSupportedLanguages.includes(
                        option.code,
                      );

                    return (
                      <label
                        key={option.code}
                        className="flex items-center justify-between rounded-md border border-emerald-200/80 bg-white/80 px-2.5 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={checked}
                            disabled={!isEditing}
                            onCheckedChange={(nextChecked) => {
                              const hasOption =
                                localLanguageSettings.customerSupportedLanguages.includes(
                                  option.code,
                                );

                              const nextLanguages = hasOption
                                ? localLanguageSettings.customerSupportedLanguages.filter(
                                    (code) => code !== option.code,
                                  )
                                : [
                                    ...localLanguageSettings.customerSupportedLanguages,
                                    option.code,
                                  ];

                              if (
                                nextChecked !== true &&
                                nextLanguages.length === 0
                              ) {
                                return;
                              }

                              setLocalLanguageSettings({
                                ...localLanguageSettings,
                                customerSupportedLanguages: nextLanguages,
                              });
                            }}
                          />
                          <span className="text-sm text-emerald-950">
                            {option.label}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="h-5 border-emerald-200 bg-emerald-50 text-[10px] font-medium text-emerald-700"
                        >
                          {option.code.toUpperCase()}
                        </Badge>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Two whole sentences, one per fact. See `fill` above for why this
              is not the six-fragment join it used to be. */}
          <p className="text-ink-tertiary space-y-1 text-[13.5px]">
            <span className="block">
              {localLanguageSettings.secondaryEnabled
                ? fill("currentModeBilingual", {
                    primary: localeName(localLanguageSettings.primaryLocale),
                    secondary: localeName(
                      localLanguageSettings.secondaryLocale,
                    ),
                  })
                : fill("currentModeSingle", {
                    primary: localeName(localLanguageSettings.primaryLocale),
                  })}
            </span>
            <span className="block">
              {localLanguageSettings.customerLanguagePreferenceEnabled
                ? fill("customerOptions", {
                    languages: localLanguageSettings.customerSupportedLanguages
                      .map(getCustomerLanguageLabel)
                      .join(", "),
                  })
                : t("customerOptionsOff")}
            </span>
          </p>
        </div>
      )}
    </SettingsBlock>
  );
}
