"use client";

import type { ReactNode } from "react";

import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useShellText } from "@/lib/shell/use-shell-text";

import { ConfirmCard } from "./ConfirmCard";

// ============================================================================
// Confirm's lower cards (the client's mock, 2026-10-01): the booking's
// details with Edit beside each, how the client is told (staff), and the
// owner's special requests.
// ============================================================================

export interface DetailRow {
  key: string;
  label: string;
  value: ReactNode;
  /** Opens the step or Details screen this row was answered on. */
  onEdit?: () => void;
}

export function DetailsCard({
  title,
  rows,
  children,
}: {
  title: string;
  rows: readonly DetailRow[];
  /** Staff controls below the rows: who is assigned. */
  children?: ReactNode;
}) {
  const t = useShellText("booking");
  return (
    <ConfirmCard label={title} id="wizard-details-card" flush>
      <dl className="px-5 pt-1 pb-2">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-baseline gap-4 border-b border-(--row-line) py-3 last:border-b-0"
          >
            <dt className="text-ink-tertiary w-[90px] shrink-0 text-[13.5px] sm:w-[120px]">
              {row.label}
            </dt>
            <dd className="text-body-ink min-w-0 flex-1 text-right text-[14px] font-medium text-pretty">
              {row.value}
            </dd>
            {row.onEdit ? (
              <button
                type="button"
                onClick={row.onEdit}
                aria-label={`${t("edit")} — ${row.label}`}
                className="text-acc-deep focus-visible:outline-primary -my-2 inline-flex min-h-10 shrink-0 items-center rounded-full px-1 text-[12.5px] font-semibold focus-visible:outline-2 max-lg:min-h-12"
              >
                {t("edit")}
              </button>
            ) : null}
          </div>
        ))}
      </dl>
      {children}
    </ConfirmCard>
  );
}

export function NotifyCard({
  email,
  onEmail,
  sms,
  onSms,
}: {
  email: boolean;
  onEmail: (on: boolean) => void;
  sms: boolean;
  onSms: (on: boolean) => void;
}) {
  const t = useShellText("booking");
  return (
    <ConfirmCard label={t("wizNotifyClient")} id="wizard-notify">
      <div className="flex flex-col gap-3 px-5 pt-3 pb-4">
        <ToggleRow
          id="confirm-email"
          title={t("emailConfirmation")}
          hint={t("wizEmailConfirmationHint")}
          checked={email}
          onChange={onEmail}
        />
        <ToggleRow
          id="confirm-sms"
          title={t("wizTextReminder")}
          hint={t("wizTextReminderHint")}
          checked={sms}
          onChange={onSms}
        />
      </div>
    </ConfirmCard>
  );
}

function ToggleRow({
  id,
  title,
  hint,
  checked,
  onChange,
}: {
  id: string;
  title: string;
  hint: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <div className="flex min-h-10 items-center gap-3">
      <label
        htmlFor={id}
        className="flex min-w-0 flex-1 cursor-pointer flex-col"
      >
        <span className="text-body-ink text-[14px] font-semibold">{title}</span>
        <span className="text-ink-tertiary text-[12.5px]">{hint}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function SpecialRequestsCard({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const t = useShellText("booking");
  return (
    <ConfirmCard className="flex flex-col">
      <div className="flex flex-col gap-2.5 px-5 py-4">
        <label
          htmlFor="booking-special-requests"
          className="text-ink-secondary text-[12px] font-semibold tracking-[0.08em] uppercase"
        >
          {t("specialRequests")}
        </label>
        <Textarea
          id="booking-special-requests"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={3}
          className="border-line-strong min-h-20 rounded-[14px] bg-(--stepper-bg) px-3.5 py-3 text-[14px]"
        />
      </div>
    </ConfirmCard>
  );
}
