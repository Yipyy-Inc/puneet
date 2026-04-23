import { vaccinationRules as initialRules } from "@/data/settings";
import type { VaccinationRule } from "@/types/facility";

const rules: VaccinationRule[] = initialRules.map((r) => ({ ...r }));
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((cb) => cb());
}

export function getVaccinationRules(): VaccinationRule[] {
  return [...rules];
}

export function addVaccinationRule(
  rule: Omit<VaccinationRule, "id">,
): VaccinationRule {
  const next: VaccinationRule = {
    ...rule,
    id: `vax-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  };
  rules.push(next);
  notify();
  return next;
}

export function updateVaccinationRule(updated: VaccinationRule): void {
  const idx = rules.findIndex((r) => r.id === updated.id);
  if (idx !== -1) {
    rules[idx] = updated;
    notify();
  }
}

export function deleteVaccinationRule(id: string): void {
  const idx = rules.findIndex((r) => r.id === id);
  if (idx !== -1) {
    rules.splice(idx, 1);
    notify();
  }
}

/** Replace all rules in bulk (used by settings save). */
export function syncVaccinationRules(next: VaccinationRule[]): void {
  rules.splice(0, rules.length, ...next);
  notify();
}

export function subscribeToVaccinationRules(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
