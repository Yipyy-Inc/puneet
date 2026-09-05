"use client";

import dynamic from "next/dynamic";

const InvoiceTemplateSettings = dynamic(
  () =>
    import("@/components/facility/InvoiceTemplateSettings").then(
      (mod) => mod.InvoiceTemplateSettings,
    ),
  { ssr: false },
);

export function InvoiceTemplateSection() {
  return (
    <div className="space-y-6">
      <InvoiceTemplateSettings />
    </div>
  );
}
