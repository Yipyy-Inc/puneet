"use client";

import type { LucideIcon } from "lucide-react";

import { useShellText } from "@/lib/shell/use-shell-text";

/** One detail the facility has on file, or plainly that it has none. */
export function OnFileRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  icon?: LucideIcon;
}) {
  const t = useShellText("yipyygo");
  const known = Boolean(value?.trim());
  return (
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
      <dt className="text-ink-secondary flex items-center gap-1.5 text-[13.5px]">
        {Icon && <Icon className="size-4" aria-hidden />}
        {label}
      </dt>
      <dd
        data-known={known}
        className="text-body-ink data-[known=false]:text-ink-tertiary min-w-0 text-[15px] font-semibold wrap-break-word data-[known=false]:font-normal"
      >
        {known ? value : t("notOnFile")}
      </dd>
    </div>
  );
}
