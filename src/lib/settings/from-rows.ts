import {
  SETTING_DOMAINS,
  defaultSettings,
  isSettingDomain,
} from "@/lib/settings/domains";

/**
 * Every domain's default, with each stored row that still matches its schema
 * laid over it as `configured: true`.
 *
 * Shared by /api/facility/settings and /api/customer/settings so the two
 * answer in one shape. A stored value that no longer matches its schema is
 * IGNORED in favour of the default, not merged and not thrown: merging would
 * hand a screen a half-shaped object it has no way to detect; throwing would
 * take a whole screen down because one domain drifted after a schema change.
 */
export function settingsFromRows(
  rows: ReadonlyArray<{ domain: string; value: unknown }>,
) {
  const settings = defaultSettings();
  for (const row of rows) {
    if (!isSettingDomain(row.domain)) continue;
    const parsed = SETTING_DOMAINS[row.domain].schema.safeParse(row.value);
    if (!parsed.success) continue;
    settings[row.domain] = { value: parsed.data, configured: true };
  }
  return settings;
}
