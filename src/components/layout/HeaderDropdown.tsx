"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import {
  getEnabledLocales,
  setClientLocaleCookie,
  type AppLocale,
} from "@/lib/language-settings";
import {
  dispatchAppLanguageChanged,
  useAppLanguageSettings,
  useAppLocale,
} from "@/hooks/use-app-locale";
import { useUiText } from "@/hooks/use-ui-text";

export function HeaderDropdown() {
  const languageSettings = useAppLanguageSettings();
  const locale = useAppLocale();
  const { t } = useUiText();
  const availableLocales = useMemo(
    () => getEnabledLocales(languageSettings),
    [languageSettings],
  );

  const switchLocale = (newLocale: AppLocale) => {
    if (!availableLocales.includes(newLocale)) return;
    setClientLocaleCookie(newLocale);
    dispatchAppLanguageChanged();
    window.location.reload();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-3">
          <Globe className="text-muted-foreground mr-2 size-4" />
          <span className="text-sm font-medium">{locale.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{t("Language")}</DropdownMenuLabel>
        {availableLocales.map((localeCode) => (
          <DropdownMenuItem
            key={localeCode}
            onClick={() => switchLocale(localeCode)}
            disabled={locale === localeCode}
            className="cursor-pointer"
          >
            {localeCode === "en" ? t("English") : "Francais"}{" "}
            {locale === localeCode && "✓"}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
