"use client";

import { Switch } from "@/components/ui/switch";
import { useLook } from "@/components/look/look-context";

// A setting with its switch at the end of the line, the clients' setup pages'
// shape (the evaluation mocks, 2026-10-02): what it does, and a line under it.
/** The evaluation mock's toggle row: 14px/600 over a 12.5px line. */
function useMockRow() {
  const look = useLook();
  return (
    (look?.names.includes("booking") || look?.names.includes("eval-module")) ??
    false
  );
}

export function SwitchRow({
  id,
  label,
  help,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  help?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const mock = useMockRow();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <label htmlFor={id} className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={
            mock
              ? help
                ? "text-body-ink text-[14px] font-semibold"
                : "text-body-ink text-[14px]"
              : "text-body-strong text-body-ink"
          }
        >
          {label}
        </span>
        {help ? (
          <span
            className={
              mock
                ? "text-ink-tertiary text-[12.5px]"
                : "text-meta text-ink-tertiary"
            }
          >
            {help}
          </span>
        ) : null}
      </label>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </div>
  );
}
