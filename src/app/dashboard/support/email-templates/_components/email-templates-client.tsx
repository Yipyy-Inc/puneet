"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

import { useEmailTemplates } from "@/lib/email-templates-store";
import { TemplatePanel } from "./template-panel";
import { TemplateSidebar } from "./template-sidebar";

export function EmailTemplatesClient() {
  const templates = useEmailTemplates();
  const [selectedId, setSelectedId] = useState<string | null>(
    () => templates[0]?.id ?? null,
  );
  const selected =
    templates.find((t) => t.id === selectedId) ?? templates[0] ?? null;

  return (
    <div className="p-4">
      <div className="flex h-[calc(100vh-9rem)] overflow-hidden rounded-xl border">
        <aside className="w-[300px] shrink-0 overflow-y-auto border-r p-3">
          <div className="mb-3 px-2">
            <h1 className="flex items-center gap-2 text-base font-semibold">
              <Mail className="text-muted-foreground size-4" />
              Email Templates
            </h1>
            <p className="text-muted-foreground text-xs">
              {templates.length} platform templates
            </p>
          </div>
          <TemplateSidebar
            templates={templates}
            selectedId={selected?.id ?? null}
            onSelect={setSelectedId}
          />
        </aside>
        <section className="min-w-0 flex-1">
          {selected ? (
            <TemplatePanel key={selected.id} template={selected} />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              No templates available.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
