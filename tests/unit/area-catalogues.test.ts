import { describe, expect, test } from "bun:test";

import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import { rich } from "../../src/lib/i18n/rich";

// ============================================================================
// THE AREA CATALOGUES, IN BOTH LANGUAGES — and one rule for all of French.
//
// `shell-i18n.test.ts` has held the shell catalogue to parity since it was
// written. The STAFF catalogue — 1,136 keys across 35 areas — had no test at
// all, and the customer-pages catalogue was created on 2026-09-10 to take the
// 2,877 strings the customer portal's pages were found to carry. Both are
// read through the same `areas → key` shape, so one file holds both to the
// same four rules.
// ============================================================================

type Areas = Record<string, Record<string, string>>;

const CATALOGUES: Record<string, { en: Areas; fr: Areas }> = {
  staff: {
    en: (en as { staff: { areas: Areas } }).staff.areas,
    fr: (fr as { staff: { areas: Areas } }).staff.areas,
  },
  customerPages: {
    en: (en as { customerPages: { areas: Areas } }).customerPages.areas,
    fr: (fr as { customerPages: { areas: Areas } }).customerPages.areas,
  },
};

/**
 * Identical in both languages on purpose — a cognate, a unit, a placeholder
 * with no words of its own. Each was read, not assumed: changing any of them
 * to shorten this list would make the French wrong.
 */
const SAME_IN_BOTH = new Set([
  // staff — French cognates and borrowings
  "staff.directory.colServices",
  "staff.shell.tabDocuments",
  "staff.roleMatrix.colPermission",
  "staff.profileTabs.date",
  "staff.profile.tabNotifications",
  "staff.profile.tabDocuments",
  "staff.warnings.typeSuspension",
  "staff.documents.typeCertification",
  "staff.documents.countDocumentsOne",
  "staff.documents.countDocumentsOther",
  "staff.documents.visibleNoteMark",
  "staff.writeUps.incident",
  "staff.writeUps.date",
  "staff.writeUps.description",
  "staff.access.permissions",
  "staff.formSections.secNotifications",
  "staff.profileSheet.tabServices",
  "staff.profileSheet.tabDocuments",
  "staff.profileSheet.tabNotifications",
  "staff.warningTemplate.fieldType",
  "staff.warningTemplate.typeDate",
  "staff.onboardingReview.institution",
  "staff.onboardingReview.transit",
  "staff.onboardingReview.notes",
  "staff.statusChange.note",
  "staff.customRole.descriptionLabel",
  "staff.employeeDashboard.services",
  "staff.employeeDashboard.saClientsTitle",
  "staff.auditTrail.filterPermissions",
  "staff.auditTrail.filterInvitations",
  "staff.departments.descriptionPlaceholder",
  "staff.createClient.stepClient",
  "staff.createClient.petNamePlaceholder", // "Buddy" — a pet's name
  "staff.createClient.lbs",
  "staff.createClient.allergies",
  "staff.createClient.marketing",
  "staff.createClient.relParent",
  "staff.createClient.acContactN",
  // customer pages
  "customerPages.dashboard.tileMessages", // Messages / Messages
  "customerPages.dashboard.points", // {points} pts — the abbreviation in both
  "customerPages.dashboard.tierFallback", // Bronze / Bronze
  "customerPages.bookings.metaDate", // Date / Date
  "customerPages.bookings.metaTotal", // Total / Total
  "customerPages.bookingDetail.serviceType_standard", // Standard / Standard
  "customerPages.bookingDetail.date", // Date / Date
  "customerPages.bookingDetail.services", // Services / Services
  "customerPages.bookingDetail.total", // Total / Total
  // The pet profile's cognates — each the same word in French.
  "customerPages.petProfile.vaccineException",
  "customerPages.petProfile.colDocument",
  "customerPages.petProfile.colService",
  "customerPages.petProfile.colDate",
  "customerPages.petProfile.colTotal",
  "customerPages.petProfile.tabPhotos",
  "customerPages.petProfile.allergies",
  "customerPages.petProfile.questionsOne",
  "customerPages.petProfile.questionsMany",
  "customerPages.petProfile.photosOne",
  "customerPages.petProfile.photosMany",
  "customerPages.petProfile.albumsOne",
  "customerPages.petProfile.albumsMany",
  "customerPages.addPet.allergies", // Allergies / Allergies
  "customerPages.formWizard.signatureAlt", // Signature / Signature
  "customerPages.formWizard.addrProvince", // Province / Province
  "customerPages.billing.services", // Services / Services
  "customerPages.billing.total", // Total / Total
  "customerPages.billing.monthPlaceholder", // MM — the month, in both
  "customerPages.training.description", // Description / Description
  "customerPages.training.date", // Date / Date
  "customerPages.yipyygo.service", // Service / Service
  "customerPages.yipyygo.date", // Date / Date
  "customerPages.packages.total", // Total / Total
  "customerPages.packages.creditsPerCycle", // {n} / cycle — "cycle" is French too
  "customerPages.packages.service", // Service / Service
  "customerPages.settings.state", // Province / Province
  "customerPages.settings.canada", // Canada / Canada
  "customerPages.settings.marketing", // Marketing / Marketing
  "customerPages.settings.channelSms", // SMS / SMS
  // "Points" and "badges" are French words too, and "{n} points" is the same.
  "customerPages.rewards.badges", // Badges / Badges
  "customerPages.rewards.points2", // points / points
  "customerPages.rewards.unitPoints", // points / points
  "customerPages.rewards.pointsCount", // {n} points
  "customerPages.rewards.pointsCountLower", // {n} points
  "customerPages.giftCards.alice", // a sample first name in a placeholder
  "customerPages.giftCards.date", // Date / Date
  "customerPages.giftCards.total", // Total / Total
  "customerPages.giftCards.code", // Code / Code
  "customerPages.reportCards.service", // Service / Service
  "customerPages.reportCards.whatsapp", // a brand name
  "customerPages.reportCards.themeHalloween", // Halloween / Halloween
  "customerPages.reportCards.chipPhoto", // "{n} photo 📷" in both
  "customerPages.reportCards.chipPhotos", // "{n} photos 📷" in both
  "customerPages.estimates.service", // Service / Service
  "customerPages.estimates.dates", // Dates / Dates
  "customerPages.estimates.total", // Total / Total
  "customerPages.refer.conditions", // Conditions / Conditions
  "customerPages.documents.docType_vaccination", // Vaccination / Vaccination
  "customerPages.documents.questionOne", // "{n} question" in both
  "customerPages.documents.questionMany", // "{n} questions" in both
  "customerPages.giftCards.statusActive", // Active / Active (la carte)
]);

/** `{name}` placeholders in a string, sorted, duplicates kept. */
function placeholders(text: string): string[] {
  return (text.match(/\{\w+\}/g) ?? []).sort();
}

for (const [name, { en: enAreas, fr: frAreas }] of Object.entries(CATALOGUES)) {
  describe(`the ${name} catalogue`, () => {
    test("every area and every key exists in both languages", () => {
      expect(Object.keys(frAreas).sort()).toEqual(Object.keys(enAreas).sort());
      for (const area of Object.keys(enAreas)) {
        expect(Object.keys(frAreas[area]).sort(), `area ${area}`).toEqual(
          Object.keys(enAreas[area]).sort(),
        );
      }
    });

    test("nothing is left in English on the French side", () => {
      const untranslated: string[] = [];
      for (const [area, keys] of Object.entries(enAreas))
        for (const [key, value] of Object.entries(keys)) {
          const id = `${name}.${area}.${key}`;
          if (!SAME_IN_BOTH.has(id) && frAreas[area]?.[key] === value)
            untranslated.push(id);
        }
      expect(untranslated).toEqual([]);
    });

    test("a French string carries every value its English one does", () => {
      // A translator who drops `{pet}` produces a sentence that reads fine and
      // silently loses the pet's name — no screenshot of the English would
      // ever show it, and no other test here would notice.
      const mismatched: string[] = [];
      for (const [area, keys] of Object.entries(enAreas))
        for (const [key, value] of Object.entries(keys)) {
          const french = frAreas[area]?.[key];
          if (french === undefined) continue;
          if (placeholders(value).join() !== placeholders(french).join())
            mismatched.push(`${name}.${area}.${key}`);
        }
      expect(mismatched).toEqual([]);
    });
  });
}

describe("French typography, across the whole catalogue", () => {
  test("a colon, a percent sign or a dollar sign is held by a non-breaking space", () => {
    // §5q: a plain space lets "42,50 $" wrap with the dollar sign alone on the
    // next line, and "Allergies :" strand its colon. Measured on 2026-09-10:
    // 78 plain spaces against 10 correct ones, across every namespace. The
    // assertion is on U+00A0 itself, because the two look identical in review
    // and that is exactly how 78 of them got in.
    const offenders: string[] = [];
    (function walk(node: unknown, path: string) {
      if (typeof node === "string") {
        if (/ [:%$]/.test(node)) offenders.push(`${path} = ${node}`);
      } else if (node && typeof node === "object") {
        for (const [key, value] of Object.entries(node))
          walk(value, path ? `${path}.${key}` : key);
      }
    })(fr, "");
    expect(offenders).toEqual([]);
  });
});

describe("rich(): a translated sentence with elements in it", () => {
  test("a placeholder becomes its part, wherever the translation put it", () => {
    const out = rich("{pet} a un nouveau bulletin", { pet: "Kofi" });
    expect(out).toHaveLength(3);
    expect(out[2]).toBe(" a un nouveau bulletin");
  });

  test("a placeholder with no part stays visible rather than vanishing", () => {
    expect(rich("Bonjour {name}", {})).toEqual(["Bonjour ", "{name}", ""]);
  });
});
