import type { Estimate } from "@/types/booking";
import { dateRangeOf } from "./email-helpers";

/** Styled service/pricing summary shared by the estimate emails (spec 6.1). */
export function EstimateSummary({ estimate }: { estimate: Estimate }) {
  const shown = estimate.lineItems.slice(0, 5);
  const moreCount = estimate.lineItems.length - shown.length;
  const room = estimate.roomType || estimate.serviceType;

  return (
    <div className="rounded-lg border">
      <div className="space-y-1.5 border-b bg-slate-50 px-4 py-3 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Service</span>
          <span className="font-medium capitalize">
            {estimate.service}
            {room ? ` · ${room}` : ""}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Dates</span>
          <span className="font-medium">{dateRangeOf(estimate)}</span>
        </div>
      </div>

      {/* Line items (up to 5) */}
      <div className="divide-y">
        {shown.map((li, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-2 text-sm"
          >
            <span>{li.label}</span>
            <span className="font-medium tabular-nums">
              ${li.total.toFixed(2)}
            </span>
          </div>
        ))}
        {moreCount > 0 && (
          <div className="px-4 py-2 text-xs text-slate-500">
            …and {moreCount} more item{moreCount === 1 ? "" : "s"}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="space-y-1 border-t bg-slate-50 px-4 py-3 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Subtotal</span>
          <span className="tabular-nums">${estimate.subtotal.toFixed(2)}</span>
        </div>
        {estimate.discount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Discount</span>
            <span className="tabular-nums">
              -${estimate.discount.toFixed(2)}
            </span>
          </div>
        )}
        {estimate.taxAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">
              Tax ({(estimate.taxRate * 100).toFixed(0)}%)
            </span>
            <span className="tabular-nums">
              ${estimate.taxAmount.toFixed(2)}
            </span>
          </div>
        )}
        <div className="flex justify-between border-t pt-1.5 font-bold">
          <span>Total</span>
          <span className="tabular-nums">${estimate.total.toFixed(2)}</span>
        </div>
        {estimate.depositRequired && estimate.depositRequired > 0 ? (
          <div className="flex justify-between text-xs text-blue-600">
            <span>Deposit required</span>
            <span className="tabular-nums">
              ${estimate.depositRequired.toFixed(2)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
