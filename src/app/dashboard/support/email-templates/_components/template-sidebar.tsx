"use client";

import { cn } from "@/lib/utils";
import type { EmailTemplate } from "@/types/email-templates";
import { CATEGORY_ORDER } from "./email-template-utils";

export function TemplateSidebar({
  templates,
  selectedId,
  onSelect,
}: {
  templates: EmailTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {CATEGORY_ORDER.map((cat) => {
        const items = templates.filter((t) => t.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat}>
            <p className="text-muted-foreground mb-1 px-2 text-[11px] font-semibold tracking-wide uppercase">
              {cat}
            </p>
            <div className="space-y-0.5">
              {items.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelect(t.id)}
                  className={cn(
                    "w-full rounded-lg px-2 py-1.5 text-left transition-colors",
                    selectedId === t.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted",
                  )}
                >
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {t.recipient}
                  </p>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
