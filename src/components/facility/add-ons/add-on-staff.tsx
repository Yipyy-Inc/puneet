"use client";

import type { AddOnDraft } from "./add-on-draft";
import { AddOnOptionCards } from "./add-on-option-cards";
import { AddOnSection } from "./add-on-section";

/** Staff — "Does this add-on require staff?" No / Yes. */
export function AddOnStaff({
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
  return (
    <AddOnSection index={index} title={t("secStaff")} hint={t("staffQuestion")}>
      <AddOnOptionCards
        label={t("staffQuestion")}
        value={draft.requiresStaff ? "yes" : "no"}
        onChange={(value) => patch({ requiresStaff: value === "yes" })}
        options={[
          { value: "no", title: t("staffNo"), hint: t("staffNoHelp") },
          { value: "yes", title: t("staffYes"), hint: t("staffYesHelp") },
        ]}
      />
    </AddOnSection>
  );
}
