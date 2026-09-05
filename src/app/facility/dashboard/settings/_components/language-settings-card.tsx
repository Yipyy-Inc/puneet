"use client";

import { useSettings } from "@/hooks/use-settings";
import {
  CUSTOMER_LANGUAGE_OPTIONS,
  getCustomerLanguageLabel,
} from "@/lib/language-settings";

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

  return (
    <SettingsBlock
      title="Language & Localization"
      description="Choose software languages and configure customer preferred-language support for signup and communications."
      data={languageSettings}
      onSave={updateLanguageSettings}
    >
      {(isEditing, localLanguageSettings, setLocalLanguageSettings) => (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-sky-100 bg-sky-50/60 p-3">
            <Languages className="mt-0.5 size-4 shrink-0 text-sky-600" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-sky-900">Software Language Mode</p>
              <p className="text-sky-800/90">
                Use English only, or enable bilingual mode (English + French) so
                forms and translated UI content can be used in both languages.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primary-language">Primary Language</Label>
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
                <SelectTrigger id="primary-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary-language">Secondary Language</Label>
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
                <SelectTrigger id="secondary-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {localLanguageSettings.primaryLocale !== "en" && (
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
              <p className="text-sm font-medium">Enable Secondary Language</p>
              <p className="text-muted-foreground text-xs">
                Turn this off for English-only operation.
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
                <p className="text-sm font-medium text-emerald-900">
                  Customer Preferred Language
                </p>
                <p className="text-xs text-emerald-800/90">
                  When enabled, customers can choose their preferred language
                  during account creation. Staff will see this language in the
                  client profile and messaging views.
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
                <p className="text-xs font-medium text-emerald-900">
                  Languages available to customers
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

          <p className="text-muted-foreground text-xs">
            Current mode:{" "}
            {localLanguageSettings.secondaryEnabled
              ? "Bilingual"
              : "Single language"}
            {" · "}
            Primary:{" "}
            {localLanguageSettings.primaryLocale === "en"
              ? "English"
              : "Français"}
            {localLanguageSettings.secondaryEnabled
              ? ` · Secondary: ${localLanguageSettings.secondaryLocale === "en" ? "English" : "Français"}`
              : ""}
            {localLanguageSettings.customerLanguagePreferenceEnabled
              ? ` · Customer signup options: ${localLanguageSettings.customerSupportedLanguages.map(getCustomerLanguageLabel).join(", ")}`
              : " · Customer preferred language: Disabled"}
          </p>
        </div>
      )}
    </SettingsBlock>
  );
}
