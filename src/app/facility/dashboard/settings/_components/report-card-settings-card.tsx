"use client";

import { useState } from "react";
import { useSettings } from "@/hooks/use-settings";

import { SettingsBlock } from "@/components/ui/settings-block";
import { ReportCardBrandedHeader } from "@/components/shared/ReportCardBrandedHeader";
import { ReportCardBrandedFooter } from "@/components/shared/ReportCardBrandedFooter";
import { ReportCardSmsPreview } from "@/components/facility/report-cards/notifications/ReportCardNotificationPreviews";
import { buildReportCardNotificationData } from "@/lib/report-cards/report-notifications";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFacilityProfile } from "@/lib/api/facility-profile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { reportCardSectionMeta } from "@/data/settings";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { formatDateLong } from "@/lib/i18n/format";

import { useCustomServices } from "@/hooks/use-custom-services";
import type {
  ReportCardSectionId,
  ReportCardServiceConfig,
  ReportCardCustomQuestion,
  CustomFeedbackType,
} from "@/types/facility";

export function ReportCardSettingsCard() {
  const { locale, section } = useSettingsText();
  const t = section("report-card-template");

  // Intl picks the plural form, not `n === 1`: French counts 0 as singular.
  const rules = new Intl.PluralRules(locale === "fr" ? "fr-CA" : "en-CA");
  const plural = (n: number, one: string, other: string) =>
    t(rules.select(n) === "one" ? one : other).replace("{n}", String(n));

  const { reportCards, updateReportCards } = useSettings();
  const { activeModules: customServices } = useCustomServices();
  // The facility's OWN details. A preview of the report card a customer will
  // receive is worthless if it is branded as somebody else's business, and this
  // screen used to render the `businessProfile` fixture in all three previews.
  const { profile: facilityProfile } = useFacilityProfile();
  const [sectionServiceId, setSectionServiceId] = useState("daycare");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] =
    useState<CustomFeedbackType>("text");
  const [newOptionText, setNewOptionText] = useState("");
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [newConditionOption, setNewConditionOption] = useState<
    Record<string, string>
  >({});
  const [newFeedbackOption, setNewFeedbackOption] = useState("");
  const [previewMode, setPreviewMode] = useState<"portal" | "sms">("portal");

  // Sample data for the live SMS preview + "send test" action.
  const buildSampleNotification = () =>
    buildReportCardNotificationData({
      reportId: "preview",
      petName: "Buddy",
      ownerName: "you",
      facilityName: facilityProfile.businessName,
      serviceType: sectionServiceId,
      mood: "happy",
      photos: [],
      summaryText:
        "Buddy had a wonderful, playful day — full of zoomies, new friends, and a great appetite!",
    });

  const themeOptions = [
    { id: "everyday", label: t("themeEveryday") },
    { id: "christmas", label: t("themeChristmas") },
    { id: "halloween", label: t("themeHalloween") },
    { id: "easter", label: t("themeEaster") },
    { id: "thanksgiving", label: t("themeThanksgiving") },
    { id: "new_year", label: t("themeNewYear") },
    { id: "valentines", label: t("themeValentines") },
  ] as const;

  const standardServices = [
    { id: "daycare", label: t("svcDaycare") },
    { id: "boarding", label: t("svcBoarding") },
    { id: "grooming", label: t("svcGrooming") },
    { id: "training", label: t("svcTraining") },
  ];

  // The eleven section names and descriptions live in a src/data fixture, so
  // they cannot know a locale. Key first, fixture second — a section added to
  // the fixture later reads as English words rather than a raw key.
  const sectionLabel = (id: string) => {
    const key = `sec_${id}`;
    const label = t(key);
    return label === key ? (reportCardSectionMeta[id]?.label ?? id) : label;
  };
  const sectionHelp = (id: string) => {
    // french-ok: a catalogue key built from the section id
    const key = `secHelp_${id}`;
    const help = t(key);
    return help === key ? (reportCardSectionMeta[id]?.description ?? "") : help;
  };

  const allServices = [
    ...standardServices,
    ...customServices.map((cs) => ({ id: cs.id, label: cs.name })),
  ];

  const allSectionIds: ReportCardSectionId[] = [
    "todaysVibe",
    "friendsAndFun",
    "careMetrics",
    "holidaySparkle",
    "closingNote",
    "overallFeedback",
    "customFeedback",
    "petCondition",
    "nextAppointment",
    "reviewBooster",
    "photoShowcase",
  ];

  const getServiceConfig = (
    cfg: typeof reportCards,
    serviceId: string,
  ): ReportCardServiceConfig => {
    return (
      cfg.serviceConfigs?.find((s) => s.serviceId === serviceId) ?? {
        serviceId,
        enabled: false,
        enabledSections: [
          "todaysVibe",
          "closingNote",
          "photoShowcase",
        ] as ReportCardSectionId[],
      }
    );
  };

  const updateServiceConfig = (
    cfg: typeof reportCards,
    serviceId: string,
    updates: Partial<ReportCardServiceConfig>,
  ) => {
    const configs = cfg.serviceConfigs ?? [];
    const existing = configs.find((s) => s.serviceId === serviceId);
    if (existing) {
      return {
        ...cfg,
        serviceConfigs: configs.map((s) =>
          s.serviceId === serviceId ? { ...s, ...updates } : s,
        ),
      };
    }
    return {
      ...cfg,
      serviceConfigs: [
        ...configs,
        {
          serviceId,
          enabled: false,
          enabledSections: [
            "todaysVibe",
            "closingNote",
            "photoShowcase",
          ] as ReportCardSectionId[],
          ...updates,
        },
      ],
    };
  };

  return (
    <SettingsBlock
      title={t("title")}
      description={t("intro")}
      data={reportCards}
      onSave={updateReportCards}
    >
      {(isEditing, localConfig, setLocalConfig) => {
        const brand = localConfig.brand ?? {
          reportTitle: t("defaultReportTitle"),
          accentColor: "#6366f1",
          showFacilityLogo: true,
          logoPosition: "top_center" as const,
          headerStyle: "centered" as const,
          showFacilityName: true,
          showFacilityPhone: true,
          showFacilityEmail: true,
          showFacilityWebsite: true,
          showSocialLinks: true,
          socialLinksStyle: "icons" as const,
          showBookingCta: true,
          bookingCtaText: t("defaultCtaText"),
          bookingCtaUrl: "",
          footerText: t("defaultFooterText"),
          showPoweredBy: true,
        };
        const updateBrand = (patch: Partial<typeof brand>) =>
          setLocalConfig({
            ...localConfig,
            brand: { ...brand, ...patch },
          });
        const overallFeedback = localConfig.overallFeedback ?? {
          title: t("defaultFeedbackTitle"),
          responseOptions: ["Excellent", "Good", "Fair", "Needs Attention"],
        };
        const customQuestions = localConfig.customQuestions ?? [];
        const petCondition = localConfig.petCondition ?? { categories: [] };
        const reviewBooster = localConfig.reviewBooster ?? {
          ratingThreshold: 4,
          reviewUrl: "",
          reviewPromptText: "",
        };

        return (
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-5">
              <TabsTrigger value="general">{t("tabGeneral")}</TabsTrigger>
              <TabsTrigger value="sections">{t("tabSections")}</TabsTrigger>
              <TabsTrigger value="feedback">{t("tabFeedback")}</TabsTrigger>
              <TabsTrigger value="condition">{t("tabCondition")}</TabsTrigger>
              <TabsTrigger value="delivery">{t("tabDelivery")}</TabsTrigger>
            </TabsList>

            {/* ── General Tab ─────────────────────────────── */}
            <TabsContent value="general" className="space-y-6">
              <div className="space-y-6">
                <Label className="text-base font-semibold">
                  {t("brandStyling")}
                </Label>

                {/* Title + Color */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("reportTitle")}</Label>
                    <Input
                      value={brand.reportTitle}
                      readOnly={!isEditing}
                      onChange={(e) =>
                        updateBrand({ reportTitle: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("accentColour")}</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brand.accentColor}
                        disabled={!isEditing}
                        className="h-10 w-12 cursor-pointer rounded-sm border disabled:cursor-not-allowed max-lg:h-12"
                        onChange={(e) =>
                          updateBrand({ accentColor: e.target.value })
                        }
                      />
                      <Input
                        value={brand.accentColor}
                        readOnly={!isEditing}
                        className="flex-1"
                        onChange={(e) =>
                          updateBrand({ accentColor: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Header Style */}
                <div className="space-y-2">
                  <Label>{t("headerStyle")}</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {/* ── THE VALUE IS NOT THE LABEL (§5q) ─────────────────
                        This rendered `{s}` — the stored value — under
                        `capitalize`, so a French reader chose between
                        "Minimal", "Banner" and "Centered". `check:ui-french`
                        cannot see it: the gate reads JSX text, and an
                        interpolation is not that.

                        The sibling picker forty lines down already does it
                        correctly, `t("socialIcons")` and friends, which is what
                        makes this one a slip rather than a pattern. Value and
                        label are separate: the value travels to the database,
                        the label is looked up. */}
                    {(
                      [
                        ["minimal", "headerMinimal"],
                        ["banner", "headerBanner"],
                        ["centered", "headerCentered"],
                      ] as const
                    ).map(([s, key]) => (
                      <button
                        key={s}
                        type="button"
                        disabled={!isEditing}
                        onClick={() => updateBrand({ headerStyle: s })}
                        className={`rounded-lg border-2 p-3 text-center text-sm font-medium transition-all ${
                          brand.headerStyle === s
                            ? "border-primary"
                            : "border-line hover:border-line-strong"
                        } disabled:bg-surface-inset disabled:text-ink-disabled disabled:cursor-not-allowed`}
                      >
                        {t(key)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logo */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="rc-show-logo"
                      checked={brand.showFacilityLogo}
                      disabled={!isEditing}
                      onCheckedChange={(checked) =>
                        updateBrand({ showFacilityLogo: checked })
                      }
                    />
                    <Label htmlFor="rc-show-logo">{t("showLogo")}</Label>
                  </div>
                  {brand.showFacilityLogo && (
                    <div className="space-y-2">
                      <Label>{t("logoPosition")}</Label>
                      <Select
                        value={brand.logoPosition ?? "top_center"}
                        disabled={!isEditing}
                        onValueChange={(v) =>
                          updateBrand({
                            logoPosition: v as
                              | "top_center"
                              | "top_left"
                              | "top_right",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top_center">
                            {t("logoTopCentre")}
                          </SelectItem>
                          <SelectItem value="top_left">
                            {t("logoTopLeft")}
                          </SelectItem>
                          <SelectItem value="top_right">
                            {t("logoTopRight")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Contact Info */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">
                    {t("contactInfo")}
                  </Label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="rc-name"
                        checked={brand.showFacilityName !== false}
                        disabled={!isEditing}
                        onCheckedChange={(c) =>
                          updateBrand({ showFacilityName: c })
                        }
                      />
                      <Label htmlFor="rc-name">{t("showFacilityName")}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="rc-phone"
                        checked={brand.showFacilityPhone !== false}
                        disabled={!isEditing}
                        onCheckedChange={(c) =>
                          updateBrand({ showFacilityPhone: c })
                        }
                      />
                      <Label htmlFor="rc-phone">{t("showPhone")}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="rc-email"
                        checked={brand.showFacilityEmail !== false}
                        disabled={!isEditing}
                        onCheckedChange={(c) =>
                          updateBrand({ showFacilityEmail: c })
                        }
                      />
                      <Label htmlFor="rc-email">{t("showEmail")}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="rc-website"
                        checked={brand.showFacilityWebsite !== false}
                        disabled={!isEditing}
                        onCheckedChange={(c) =>
                          updateBrand({ showFacilityWebsite: c })
                        }
                      />
                      <Label htmlFor="rc-website">{t("showWebsite")}</Label>
                    </div>
                  </div>
                </div>

                {/* Social Media */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="rc-social"
                      checked={brand.showSocialLinks !== false}
                      disabled={!isEditing}
                      onCheckedChange={(c) =>
                        updateBrand({ showSocialLinks: c })
                      }
                    />
                    <Label
                      htmlFor="rc-social"
                      className="text-sm font-semibold"
                    >
                      {t("showSocialLinks")}
                    </Label>
                  </div>
                  {brand.showSocialLinks && (
                    <div className="space-y-2">
                      <Label>{t("socialLinksStyle")}</Label>
                      <Select
                        value={brand.socialLinksStyle ?? "icons"}
                        disabled={!isEditing}
                        onValueChange={(v) =>
                          updateBrand({
                            socialLinksStyle: v as
                              | "icons"
                              | "buttons"
                              | "text_links",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="icons">
                            {t("socialIcons")}
                          </SelectItem>
                          <SelectItem value="buttons">
                            {t("socialButtons")}
                          </SelectItem>
                          <SelectItem value="text_links">
                            {t("socialTextLinks")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Booking CTA */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="rc-cta"
                      checked={brand.showBookingCta !== false}
                      disabled={!isEditing}
                      onCheckedChange={(c) =>
                        updateBrand({ showBookingCta: c })
                      }
                    />
                    <Label htmlFor="rc-cta" className="text-sm font-semibold">
                      {t("bookingCta")}
                    </Label>
                  </div>
                  {brand.showBookingCta && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t("buttonText")}</Label>
                        <Input
                          value={brand.bookingCtaText ?? t("defaultCtaText")}
                          readOnly={!isEditing}
                          onChange={(e) =>
                            updateBrand({ bookingCtaText: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("buttonUrl")}</Label>
                        <Input
                          value={brand.bookingCtaUrl ?? ""}
                          readOnly={!isEditing}
                          placeholder="https://..."
                          onChange={(e) =>
                            updateBrand({ bookingCtaUrl: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">{t("footer")}</Label>
                  <div className="space-y-2">
                    <Label>{t("customFooterText")}</Label>
                    <Textarea
                      value={brand.footerText ?? ""}
                      readOnly={!isEditing}
                      rows={2}
                      placeholder={t("defaultFooterText")}
                      onChange={(e) =>
                        updateBrand({ footerText: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="rc-powered"
                      checked={brand.showPoweredBy !== false}
                      disabled={!isEditing}
                      onCheckedChange={(c) => updateBrand({ showPoweredBy: c })}
                    />
                    <Label htmlFor="rc-powered">{t("showPoweredBy")}</Label>
                  </div>
                </div>

                {/* AI Tone */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">{t("aiTone")}</Label>
                  <p className="text-muted-foreground text-xs">
                    {t("aiToneHelp")}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        value: "warm" as const,
                        label: t("toneWarm"),
                        desc: t("toneWarmHelp"),
                      },
                      {
                        value: "professional" as const,
                        label: t("toneProfessional"),
                        desc: t("toneProfessionalHelp"),
                      },
                      {
                        value: "playful" as const,
                        label: t("tonePlayful"),
                        desc: t("tonePlayfulHelp"),
                      },
                      // `tone`, not `t` — the translator is called above.
                    ].map((tone) => (
                      <button
                        key={tone.value}
                        type="button"
                        disabled={!isEditing}
                        onClick={() => updateBrand({ aiTone: tone.value })}
                        className={`rounded-lg border-2 p-3 text-left transition-all ${
                          (brand.aiTone ?? "warm") === tone.value
                            ? "border-primary"
                            : "border-line hover:border-line-strong"
                        } disabled:bg-surface-inset disabled:text-ink-disabled disabled:cursor-not-allowed`}
                      >
                        <p className="text-sm font-medium">{tone.label}</p>
                        <p className="text-muted-foreground text-[11px]">
                          {tone.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Preview */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">
                      {t("livePreview")}
                    </Label>
                    {/* In-portal ↔ SMS switch */}
                    <div className="flex rounded-md border p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setPreviewMode("portal")}
                        className={`rounded-sm px-2.5 py-1 font-medium ${
                          previewMode === "portal"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {t("previewInPortal")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode("sms")}
                        className={`rounded-sm px-2.5 py-1 font-medium ${
                          previewMode === "sms"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {t("previewSms")}
                      </button>
                    </div>
                  </div>

                  {previewMode === "portal" ? (
                    <div className="overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-white">
                      <ReportCardBrandedHeader
                        brandConfig={brand}
                        profile={facilityProfile}
                        title={t("previewTitle")
                          .replace(
                            "{title}",
                            brand.reportTitle || t("defaultReportTitle"),
                          )
                          .replace("{pet}", "Buddy")}
                        subtitle={t("previewSubtitle")
                          .replace("{service}", t("svcDaycare"))
                          .replace(
                            "{date}",
                            formatDateLong(new Date(), locale),
                          )}
                      />
                      <div className="space-y-1.5 px-6 py-4">
                        {/* Reflects the section toggles for the selected service */}
                        {getServiceConfig(
                          localConfig,
                          sectionServiceId,
                        ).enabledSections.map((sid) => (
                          <div
                            key={sid}
                            className="flex items-center gap-2 text-xs text-slate-600"
                          >
                            <Check className="size-3 text-emerald-500" />
                            {sectionLabel(sid)}
                          </div>
                        ))}
                        {sectionServiceId === "grooming" &&
                          localConfig.groomingBeforeAfter && (
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <Check className="size-3 text-emerald-500" />
                              {t("beforeAfterSlider")}
                            </div>
                          )}
                        {getServiceConfig(localConfig, sectionServiceId)
                          .enabledSections.length === 0 && (
                          <p className="text-muted-foreground text-center text-xs italic">
                            {t("noSectionsEnabled")}
                          </p>
                        )}
                      </div>
                      <div className="border-t">
                        <ReportCardBrandedFooter
                          brandConfig={brand}
                          profile={facilityProfile}
                        />
                      </div>
                    </div>
                  ) : (
                    <ReportCardSmsPreview data={buildSampleNotification()} />
                  )}

                  {/* "Send test report to myself" was REMOVED, not repaired.
                      It called sendReportCardNotifications — which pushes onto
                      an in-memory array — and then said "Test report sent to
                      you. Delivered via email, SMS." No message was ever
                      addressed, let alone transmitted.

                      A test button whose only effect is to claim success is
                      worse than no button: it is the control a facility would
                      use to convince themselves delivery works. The previews
                      above are the honest version of what it offered — they
                      show exactly what would be sent. When a real transport
                      exists, a test send can come back with it. */}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  {t("enabledServices")}
                </Label>
                <p className="text-muted-foreground text-sm">
                  {t("enabledServicesHelp")}
                </p>
                <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                  {allServices.map((svc) => {
                    const svcCfg = getServiceConfig(localConfig, svc.id);
                    return (
                      <div key={svc.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`rc-svc-${svc.id}`}
                          checked={svcCfg.enabled}
                          disabled={!isEditing}
                          onCheckedChange={(checked) =>
                            setLocalConfig(
                              updateServiceConfig(localConfig, svc.id, {
                                enabled: checked === true,
                              }),
                            )
                          }
                        />
                        <Label htmlFor={`rc-svc-${svc.id}`}>{svc.label}</Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  {t("enabledThemes")}
                </Label>
                <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                  {themeOptions.map((theme) => (
                    <div key={theme.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`theme-${theme.id}`}
                        checked={localConfig.enabledThemes.includes(theme.id)}
                        disabled={!isEditing}
                        onCheckedChange={(checked) => {
                          const enabled = checked === true;
                          setLocalConfig({
                            ...localConfig,
                            enabledThemes: enabled
                              ? [...localConfig.enabledThemes, theme.id]
                              : localConfig.enabledThemes.filter(
                                  (t) => t !== theme.id,
                                ),
                          });
                        }}
                      />
                      <Label htmlFor={`theme-${theme.id}`}>{theme.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ── Sections Tab ─────────────────────────────── */}
            <TabsContent value="sections" className="space-y-6">
              <div className="space-y-2">
                <Label>{t("configureSectionsFor")}</Label>
                <Select
                  value={sectionServiceId}
                  onValueChange={setSectionServiceId}
                >
                  <SelectTrigger className="min-w-60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allServices.map((svc) => (
                      <SelectItem key={svc.id} value={svc.id}>
                        {svc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                {allSectionIds.map((sectionId) => {
                  const meta = reportCardSectionMeta[sectionId];
                  const svcCfg = getServiceConfig(
                    localConfig,
                    sectionServiceId,
                  );
                  const isOn = svcCfg.enabledSections.includes(sectionId);
                  return (
                    <div
                      key={sectionId}
                      className="flex items-center justify-between rounded-lg border px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {sectionLabel(sectionId)}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {sectionHelp(sectionId)}
                        </p>
                      </div>
                      <Switch
                        checked={isOn}
                        disabled={!isEditing}
                        onCheckedChange={(checked) => {
                          const newSections = (
                            checked
                              ? [...svcCfg.enabledSections, sectionId]
                              : svcCfg.enabledSections.filter(
                                  (s) => s !== sectionId,
                                )
                          ) as ReportCardSectionId[];
                          setLocalConfig(
                            updateServiceConfig(localConfig, sectionServiceId, {
                              enabledSections: newSections,
                            }),
                          );
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Grooming-only: Before/After photo pair */}
              {sectionServiceId === "grooming" && (
                <div className="flex items-center justify-between rounded-lg border border-pink-200 bg-pink-50/60 px-4 py-3 dark:border-pink-900 dark:bg-pink-950/20">
                  <div>
                    <p className="text-sm font-medium">
                      {t("beforeAfterPhotos")}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t("beforeAfterHelp")}
                    </p>
                  </div>
                  <Switch
                    checked={localConfig.groomingBeforeAfter ?? false}
                    disabled={!isEditing}
                    onCheckedChange={(checked) =>
                      setLocalConfig({
                        ...localConfig,
                        groomingBeforeAfter: checked === true,
                      })
                    }
                  />
                </div>
              )}
            </TabsContent>

            {/* ── Feedback Tab ─────────────────────────────── */}
            <TabsContent value="feedback" className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  {t("overallFeedback")}
                </Label>
                <div className="space-y-2">
                  <Label>{t("feedbackTitle")}</Label>
                  <Input
                    value={overallFeedback.title}
                    readOnly={!isEditing}
                    onChange={(e) =>
                      setLocalConfig({
                        ...localConfig,
                        overallFeedback: {
                          ...overallFeedback,
                          title: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("responseOptions")}</Label>
                  <div className="space-y-1">
                    {overallFeedback.responseOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={opt}
                          readOnly={!isEditing}
                          className="flex-1"
                          onChange={(e) => {
                            const updated = [
                              ...overallFeedback.responseOptions,
                            ];
                            updated[idx] = e.target.value;
                            setLocalConfig({
                              ...localConfig,
                              overallFeedback: {
                                ...overallFeedback,
                                responseOptions: updated,
                              },
                            });
                          }}
                        />
                        {isEditing && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updated =
                                overallFeedback.responseOptions.filter(
                                  (_, i) => i !== idx,
                                );
                              setLocalConfig({
                                ...localConfig,
                                overallFeedback: {
                                  ...overallFeedback,
                                  responseOptions: updated,
                                },
                              });
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {isEditing && (
                      <div className="flex items-center gap-2 pt-1">
                        <Input
                          placeholder={t("newOptionPlaceholder")}
                          value={newFeedbackOption}
                          onChange={(e) => setNewFeedbackOption(e.target.value)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!newFeedbackOption.trim()}
                          onClick={() => {
                            setLocalConfig({
                              ...localConfig,
                              overallFeedback: {
                                ...overallFeedback,
                                responseOptions: [
                                  ...overallFeedback.responseOptions,
                                  newFeedbackOption.trim(),
                                ],
                              },
                            });
                            setNewFeedbackOption("");
                          }}
                        >
                          <Plus className="mr-1 size-4" /> {t("add")}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  {t("customQuestions")}
                </Label>
                <p className="text-muted-foreground text-sm">
                  {t("customQuestionsHelp")}
                </p>
                <div className="space-y-2">
                  {customQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between rounded-lg border px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{q.question}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {q.type.replace("_", "/")}
                          </Badge>
                          {q.required && (
                            <Badge variant="secondary" className="text-xs">
                              {t("required")}
                            </Badge>
                          )}
                          {q.type === "select" && q.options && (
                            <span className="text-muted-foreground text-xs">
                              {plural(
                                q.options.length,
                                "optionCountOne",
                                "optionCountOther",
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      {isEditing && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setLocalConfig({
                              ...localConfig,
                              customQuestions: customQuestions.filter(
                                (cq) => cq.id !== q.id,
                              ),
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {isEditing && (
                  <Card>
                    <CardContent className="space-y-3 p-4">
                      <Label className="text-sm font-medium">
                        {t("addNewQuestion")}
                      </Label>
                      <Input
                        placeholder={t("questionPlaceholder")}
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">{t("questionType")}</Label>
                          <Select
                            value={newQuestionType}
                            onValueChange={(v) =>
                              setNewQuestionType(v as CustomFeedbackType)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">
                                {t("typeText")}
                              </SelectItem>
                              <SelectItem value="rating">
                                {t("typeRating")}
                              </SelectItem>
                              <SelectItem value="select">
                                {t("typeSelect")}
                              </SelectItem>
                              <SelectItem value="yes_no">
                                {t("typeYesNo")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {newQuestionType === "select" && (
                          <div className="space-y-1">
                            <Label className="text-xs">
                              {t("optionsCommaSeparated")}
                            </Label>
                            <Input
                              placeholder={t("optionsPlaceholder")}
                              value={newOptionText}
                              onChange={(e) => setNewOptionText(e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!newQuestionText.trim()}
                        onClick={() => {
                          const newQ: ReportCardCustomQuestion = {
                            id: `q-${Date.now()}`,
                            question: newQuestionText.trim(),
                            type: newQuestionType,
                            options:
                              newQuestionType === "select"
                                ? newOptionText
                                    .split(",")
                                    .map((o) => o.trim())
                                    .filter(Boolean)
                                : undefined,
                            required: false,
                          };
                          setLocalConfig({
                            ...localConfig,
                            customQuestions: [...customQuestions, newQ],
                          });
                          setNewQuestionText("");
                          setNewOptionText("");
                        }}
                      >
                        <Plus className="mr-1 size-4" /> {t("addQuestion")}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* ── Condition Tab ─────────────────────────────── */}
            <TabsContent value="condition" className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  {t("petConditionCategories")}
                </Label>
                <p className="text-muted-foreground text-sm">
                  {t("petConditionHelp")}
                </p>
                {petCondition.categories.map((cat) => (
                  <Card key={cat.id}>
                    <CardHeader className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{cat.label}</CardTitle>
                        {isEditing && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setLocalConfig({
                                ...localConfig,
                                petCondition: {
                                  categories: petCondition.categories.filter(
                                    (c) => c.id !== cat.id,
                                  ),
                                },
                              })
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pt-0 pb-4">
                      <div className="flex flex-wrap gap-1.5">
                        {cat.options.map((opt, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="gap-1 text-xs"
                          >
                            {opt}
                            {isEditing && (
                              <button
                                className="hover:text-destructive ml-1"
                                onClick={() => {
                                  const updatedCats =
                                    petCondition.categories.map((c) =>
                                      c.id === cat.id
                                        ? {
                                            ...c,
                                            options: c.options.filter(
                                              (_, i) => i !== idx,
                                            ),
                                          }
                                        : c,
                                    );
                                  setLocalConfig({
                                    ...localConfig,
                                    petCondition: { categories: updatedCats },
                                  });
                                }}
                              >
                                x
                              </button>
                            )}
                          </Badge>
                        ))}
                      </div>
                      {isEditing && (
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            placeholder={t("newOptionPlaceholder")}
                            value={newConditionOption[cat.id] ?? ""}
                            onChange={(e) =>
                              setNewConditionOption({
                                ...newConditionOption,
                                [cat.id]: e.target.value,
                              })
                            }
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              !(newConditionOption[cat.id] ?? "").trim()
                            }
                            onClick={() => {
                              const updatedCats = petCondition.categories.map(
                                (c) =>
                                  c.id === cat.id
                                    ? {
                                        ...c,
                                        options: [
                                          ...c.options,
                                          (
                                            newConditionOption[cat.id] ?? ""
                                          ).trim(),
                                        ],
                                      }
                                    : c,
                              );
                              setLocalConfig({
                                ...localConfig,
                                petCondition: { categories: updatedCats },
                              });
                              setNewConditionOption({
                                ...newConditionOption,
                                [cat.id]: "",
                              });
                            }}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {isEditing && (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={t("newCategoryPlaceholder")}
                      value={newCategoryLabel}
                      onChange={(e) => setNewCategoryLabel(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      disabled={!newCategoryLabel.trim()}
                      onClick={() => {
                        setLocalConfig({
                          ...localConfig,
                          petCondition: {
                            categories: [
                              ...petCondition.categories,
                              {
                                id: `cat-${Date.now()}`,
                                label: newCategoryLabel.trim(),
                                options: ["Normal"],
                              },
                            ],
                          },
                        });
                        setNewCategoryLabel("");
                      }}
                    >
                      <Plus className="mr-1 size-4" /> {t("addCategory")}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Delivery Tab ─────────────────────────────── */}
            <TabsContent value="delivery" className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  {t("autoSendTiming")}
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    value={localConfig.autoSend.mode}
                    disabled={!isEditing}
                    onValueChange={(value: "immediate" | "scheduled") =>
                      setLocalConfig({
                        ...localConfig,
                        autoSend: { ...localConfig.autoSend, mode: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">
                        {t("sendImmediately")}
                      </SelectItem>
                      <SelectItem value="scheduled">
                        {t("scheduleForTime")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="time"
                    aria-label={t("sendTime")}
                    value={localConfig.autoSend.sendTime ?? "18:00"}
                    readOnly={
                      !isEditing || localConfig.autoSend.mode !== "scheduled"
                    }
                    className={
                      !isEditing || localConfig.autoSend.mode !== "scheduled"
                        ? "cursor-not-allowed bg-gray-100"
                        : ""
                    }
                    onChange={(e) =>
                      setLocalConfig({
                        ...localConfig,
                        autoSend: {
                          ...localConfig.autoSend,
                          sendTime: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-4 pt-2">
                  {(["email", "message", "sms"] as const).map((ch) => (
                    <div key={ch} className="flex items-center gap-2">
                      <Checkbox
                        id={`rc-send-${ch}`}
                        checked={localConfig.autoSend.channels[ch]}
                        disabled={!isEditing}
                        onCheckedChange={(checked) =>
                          setLocalConfig({
                            ...localConfig,
                            autoSend: {
                              ...localConfig.autoSend,
                              channels: {
                                ...localConfig.autoSend.channels,
                                [ch]: checked === true,
                              },
                            },
                          })
                        }
                      />
                      {/* `capitalize` was rendering the raw enum — "email",
                          "sms". Capitalising an enum does not translate it. */}
                      <Label htmlFor={`rc-send-${ch}`}>
                        {t(
                          ch === "email"
                            ? "channelEmail"
                            : ch === "sms"
                              ? "channelSms"
                              : "channelMessage",
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  {t("reviewBooster")}
                </Label>
                <p className="text-muted-foreground text-sm">
                  {t("reviewBoosterHelp")}
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("minRating")}</Label>
                    <Select
                      value={String(reviewBooster.ratingThreshold)}
                      disabled={!isEditing}
                      onValueChange={(v) =>
                        setLocalConfig({
                          ...localConfig,
                          reviewBooster: {
                            ...reviewBooster,
                            ratingThreshold: Number(v),
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {plural(n, "starCountOne", "starCountOther")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("reviewUrl")}</Label>
                    <Input
                      placeholder="https://g.page/your-business/review"
                      value={reviewBooster.reviewUrl}
                      readOnly={!isEditing}
                      onChange={(e) =>
                        setLocalConfig({
                          ...localConfig,
                          reviewBooster: {
                            ...reviewBooster,
                            reviewUrl: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("reviewPromptText")}</Label>
                  <Textarea
                    value={reviewBooster.reviewPromptText}
                    readOnly={!isEditing}
                    onChange={(e) =>
                      setLocalConfig({
                        ...localConfig,
                        reviewBooster: {
                          ...reviewBooster,
                          reviewPromptText: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                {/* Optional per-platform review links (feed the facility Reviews) */}
                <div className="grid gap-4 md:grid-cols-3">
                  {(
                    [
                      { key: "googleUrl", label: t("googleUrl") },
                      { key: "yelpUrl", label: t("yelpUrl") },
                      { key: "facebookUrl", label: t("facebookUrl") },
                    ] as const
                  ).map((p) => (
                    <div key={p.key} className="space-y-2">
                      <Label className="text-xs">{p.label}</Label>
                      <Input
                        placeholder="https://…"
                        value={reviewBooster[p.key] ?? ""}
                        readOnly={!isEditing}
                        onChange={(e) =>
                          setLocalConfig({
                            ...localConfig,
                            reviewBooster: {
                              ...reviewBooster,
                              [p.key]: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  {t("templateWording")}
                </Label>
                <div className="space-y-4">
                  {themeOptions.map((theme) => (
                    <Card key={theme.id}>
                      <CardHeader className="cursor-pointer px-4 py-3">
                        <CardTitle className="text-sm">{theme.label}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 px-4 pt-0 pb-4">
                        {(
                          [
                            "todaysVibe",
                            "friendsAndFun",
                            "careMetrics",
                            "holidaySparkle",
                            "closingNote",
                          ] as const
                        ).map((field) => (
                          <div key={field} className="space-y-1">
                            <Label className="text-xs capitalize">
                              {field.replace(/([A-Z])/g, " $1").trim()}
                            </Label>
                            <Textarea
                              value={localConfig.templates[theme.id][field]}
                              readOnly={!isEditing}
                              className="min-h-[60px] text-sm"
                              onChange={(e) =>
                                setLocalConfig({
                                  ...localConfig,
                                  templates: {
                                    ...localConfig.templates,
                                    [theme.id]: {
                                      ...localConfig.templates[theme.id],
                                      [field]: e.target.value,
                                    },
                                  },
                                })
                              }
                            />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        );
      }}
    </SettingsBlock>
  );
}
