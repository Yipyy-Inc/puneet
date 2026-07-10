import { createElement, type ReactNode } from "react";

// Shared formatting for HQ metric cells. A metric that a location does not
// offer (undefined / null / NaN) must read as "Not offered at this location"
// in grey italic — never a blank cell or a bare "N/A".

export const NOT_OFFERED_LABEL = "Not offered at this location";
export const NOT_OFFERED_CLASS = "text-muted-foreground italic";

/** True when a metric value should render as "not offered". */
export function isMetricMissing(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "number" && Number.isNaN(value))
  );
}

/**
 * Render a metric cell. When the value is missing (a service/metric the
 * location doesn't offer) it returns the grey-italic "Not offered at this
 * location" node; otherwise it returns `format(value)` (or the value itself).
 */
export function formatMetricCell<T>(
  value: T | null | undefined,
  format?: (v: T) => ReactNode,
): ReactNode {
  if (isMetricMissing(value)) {
    return createElement(
      "span",
      { className: NOT_OFFERED_CLASS },
      NOT_OFFERED_LABEL,
    );
  }
  const present = value as T;
  return format ? format(present) : (present as ReactNode);
}
