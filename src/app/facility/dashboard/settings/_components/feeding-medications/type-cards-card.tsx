"use client";

import { Switch } from "@/components/ui/switch";
import { fill } from "@/lib/medications/dose";

import { CountChip, SetupCard } from "./setup-card";

// ============================================================================
// FOOD TYPES / MEDICATION TYPES: one card per kind, with what it needs — where
// it is kept, how it is given — and a switch. A kind switched off is not
// offered on the booking form; its card says so in a quieter ink, never by
// fading (§6 rule 4).
// ============================================================================

export function TypeCardsCard<T extends string>({
  id,
  title,
  help,
  items,
  on,
  onChange,
  changed,
  onReset,
  t,
  children,
}: {
  id: string;
  title: string;
  help: string;
  items: { id: T; label: string; sub: string }[];
  on: readonly T[];
  onChange: (on: T[]) => void;
  changed: boolean;
  onReset: () => void;
  t: (key: string) => string;
  /** Rows under the grid — "Staff can split tablets". */
  children?: React.ReactNode;
}) {
  const count = items.filter((item) => on.includes(item.id)).length;
  const toggle = (id: T, checked: boolean) =>
    onChange(
      checked
        ? items.map((item) => item.id).filter((x) => x === id || on.includes(x))
        : on.filter((x) => x !== id),
    );

  return (
    <SetupCard
      id={id}
      title={title}
      help={help}
      aside={
        <CountChip>
          {fill(t("countOn"), { on: count, total: items.length })}
        </CountChip>
      }
      changed={changed}
      changedNote={t("changedNote")}
      resetLabel={t("resetSection")}
      onReset={onReset}
    >
      <div className="grid grid-cols-1 gap-2.5 px-5 py-4 sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] sm:px-6">
        {items.map((item) => {
          const checked = on.includes(item.id);
          return (
            <label
              key={item.id}
              data-on={checked}
              className="border-line bg-card flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  data-on={checked}
                  className="text-body-strong text-ink-tertiary data-[on=true]:text-body-ink"
                >
                  {item.label}
                </span>
                <span className="text-meta text-ink-tertiary">{item.sub}</span>
              </span>
              <Switch
                checked={checked}
                onCheckedChange={(value) => toggle(item.id, value)}
                aria-label={item.label}
              />
            </label>
          );
        })}
      </div>
      {children}
    </SetupCard>
  );
}
