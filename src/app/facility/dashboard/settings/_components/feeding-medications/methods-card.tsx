"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import type { AppLocale } from "@/lib/language-settings";
import { methodName } from "@/lib/medications/describe";
import { fill } from "@/lib/medications/dose";
import { newRowId } from "@/lib/settings/care-setup";
import {
  canSell,
  isCustomMethod,
  type MethodRow,
  type ProvidedPer,
} from "@/lib/settings/medication-instructions";

import { MoneyInput } from "./money-input";
import { SetupCard } from "./setup-card";

// ============================================================================
// HOW MEDICATION IS GIVEN: every way of giving the booking form offers, on or
// off; and for what the facility can supply — pill pockets, cheese, peanut
// butter, a wrap, and any way it adds — "We sell it", at a price per dose or
// per day. A facility's own way of giving is offered for every form, and it
// can take one away again, with an Undo.
// ============================================================================

const GRID =
  "sm:grid-cols-[3.25rem_minmax(0,1.6fr)_6.5rem_minmax(0,1.8fr)_6rem]";

export function MethodsCard({
  methods,
  onChange,
  changed,
  onReset,
  removed,
  t,
  bt,
  locale,
}: {
  methods: MethodRow[];
  onChange: (change: (rows: MethodRow[]) => MethodRow[]) => void;
  changed: boolean;
  onReset: () => void;
  removed: (name: string, undo: () => void) => void;
  t: (key: string) => string;
  bt: (key: string) => string;
  locale: AppLocale;
}) {
  const [draft, setDraft] = useState("");
  const setRow = (id: string, patch: Partial<MethodRow>) =>
    onChange((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  const add = () => {
    const label = draft.trim();
    setDraft("");
    if (!label) return;
    const known = methods.some(
      (row) =>
        methodName(bt, row.id, row.label).toLowerCase() === label.toLowerCase(),
    );
    if (known) return;
    const row: MethodRow = {
      id: newRowId("method"),
      label,
      on: true,
      sell: false,
      price: 0.5,
      per: "dose",
    };
    onChange((current) => [...current, row]);
  };

  return (
    <SetupCard
      id="m-methods"
      title={t("methodsTitle")}
      help={t("methodsHelp")}
      changed={changed}
      changedNote={t("changedNote")}
      resetLabel={t("resetSection")}
      onReset={onReset}
    >
      <div
        aria-hidden
        className={`bg-surface-inset hidden gap-3 border-b border-(--inset-2) px-6 py-2.5 text-[12px] font-semibold tracking-[0.06em] text-(--care-micro) uppercase sm:grid ${GRID}`}
      >
        <span>{t("colOn")}</span>
        <span>{t("colMethod")}</span>
        <span>{t("colSell")}</span>
        <span>{t("colPrice")}</span>
        <span />
      </div>
      <div className="flex flex-col">
        {methods.map((row, index) => {
          const name = methodName(bt, row.id, row.label);
          const own = isCustomMethod(row.id);
          const sellable = canSell(row.id);
          // Below 640px the row is two lines, not a table squeezed into one
          // column (§6 rule 6): the method, then what it sells for — and no
          // second line for what cannot be sold.
          return (
            <div
              key={row.id}
              className={`flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 border-t border-(--row-line) px-5 py-3 first:border-t-0 sm:grid sm:px-6 ${GRID}`}
            >
              <Switch
                size="sm"
                checked={row.on}
                onCheckedChange={(on) => setRow(row.id, { on })}
                aria-label={fill(t("methodOn"), { name })}
              />
              <span
                data-on={row.on}
                className="data-[on=true]:text-body-ink min-w-0 flex-1 text-[15px] font-medium wrap-break-word text-(--care-micro)"
              >
                {name}
              </span>
              <div
                data-sells={sellable && row.on}
                className="flex basis-full flex-wrap items-center gap-3 max-sm:order-last data-[sells=false]:max-sm:hidden sm:contents"
              >
                {sellable && row.on ? (
                  <label className="flex items-center gap-2">
                    <Switch
                      size="sm"
                      checked={row.sell}
                      onCheckedChange={(sell) => setRow(row.id, { sell })}
                      aria-label={fill(t("sellLabel"), { name })}
                    />
                    <span className="text-ink-tertiary text-[13px] sm:hidden">
                      {t("colSell")}
                    </span>
                  </label>
                ) : (
                  <span aria-hidden className="text-ink-tertiary text-[13px]">
                    —
                  </span>
                )}
                {sellable && row.on && row.sell ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="w-28">
                      <MoneyInput
                        value={row.price}
                        onChange={(price) => setRow(row.id, { price })}
                        label={fill(t("priceLabel"), { name })}
                        locale={locale}
                      />
                    </div>
                    <Segmented<ProvidedPer>
                      name={`per-${row.id}`}
                      label={fill(t("perLabel"), { name })}
                      value={row.per}
                      options={[
                        { value: "dose", label: t("perDose") },
                        { value: "day", label: t("perDay") },
                      ]}
                      onChange={(per) => setRow(row.id, { per })}
                    />
                  </div>
                ) : (
                  <span className="hidden sm:block" />
                )}
              </div>
              <div className="flex min-h-10 items-center max-lg:min-h-12 sm:justify-end">
                {own ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-bad hover:text-bad font-normal"
                    aria-label={fill(t("removeNamed"), { name })}
                    onClick={() => {
                      onChange((current) =>
                        current.filter((candidate) => candidate.id !== row.id),
                      );
                      removed(name, () =>
                        onChange((current) =>
                          current.some((candidate) => candidate.id === row.id)
                            ? current
                            : [
                                ...current.slice(0, index),
                                row,
                                ...current.slice(index),
                              ],
                        ),
                      );
                    }}
                  >
                    {t("remove")}
                  </Button>
                ) : (
                  <span className="text-[12px] font-semibold tracking-[0.06em] text-(--care-micro) uppercase">
                    {t("defaultTag")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-(--row-line) px-5 pt-3 pb-[18px] sm:px-6">
        <Input
          value={draft}
          maxLength={40}
          placeholder={t("addMethodPlaceholder")}
          aria-label={t("addMethodLabel")}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          className="w-64 max-w-full"
        />
        <Button
          type="button"
          variant="quiet"
          size="setup"
          className="text-primary gap-1 border-[1.5px] border-dashed border-(--cs-line) font-semibold"
          disabled={methods.length >= 40}
          onClick={add}
        >
          <span aria-hidden>+</span>
          {t("addMethod")}
        </Button>
      </div>
    </SetupCard>
  );
}
