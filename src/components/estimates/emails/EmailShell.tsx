import type { ReactNode } from "react";
import { defaultInvoiceTemplate } from "@/data/invoice-template";
import type { InvoiceTemplate } from "@/types/invoice-template";

interface EmailShellProps {
  subject: string;
  /** Branding source — defaults to the facility's Invoice Template (Table 82). */
  template?: InvoiceTemplate;
  children: ReactNode;
}

/**
 * Branded frame shared by all estimate/booking email previews: subject line,
 * logo/name header on the accent colour, body slot, and footer — all pulled
 * from the Invoice Template settings (Table 82).
 */
export function EmailShell({
  subject,
  template = defaultInvoiceTemplate,
  children,
}: EmailShellProps) {
  const accent = template.accentColor;
  const facilityName = template.facilityName;

  return (
    <div className="mx-auto max-w-[600px] overflow-hidden rounded-xl border bg-white text-slate-800 shadow-sm">
      {/* Subject preview */}
      <div className="border-b bg-slate-50 px-5 py-2 text-xs text-slate-500">
        <span className="font-semibold">Subject:</span> {subject}
      </div>

      {/* Branded header */}
      <div
        className="flex items-center gap-3 px-6 py-5"
        style={{ backgroundColor: accent }}
      >
        {template.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={template.logoUrl}
            alt={facilityName}
            className="h-8 w-auto"
          />
        ) : null}
        <span className="text-base font-bold text-white">{facilityName}</span>
      </div>

      <div className="space-y-4 p-6">{children}</div>

      {/* Footer */}
      <div className="border-t bg-slate-50 px-6 py-4 text-center text-xs text-slate-500">
        <p>{template.footerText}</p>
        <p className="mt-1">
          {facilityName}
          {template.phone ? ` · ${template.phone}` : ""}
          {template.email ? ` · ${template.email}` : ""}
        </p>
      </div>
    </div>
  );
}
