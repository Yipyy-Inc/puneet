import type {
  UnfinishedBookingRecovery,
  UnfinishedBookingRecoverySend,
} from "@/types/unfinished-booking";

// ============================================================================
// What staff are told about an unfinished booking's recovery message.
//
// Pure, returning catalogue keys (staff area `unfinishedRecovery`) and the
// instant to format, so the screen translates every word and formats every
// date through Intl. The tick's `recovery_detail` and the outbox's
// `skip_reason` are internal English; they are classified here, never shown.
// ============================================================================

export type RecoveryLine =
  | { key: string }
  | { key: string; when: string }
  | { key: string; reasonKey: string };

const SKIP_REASON_KEYS: [RegExp, string][] = [
  [/^suppressed:/, "reasonUnsubscribed"],
  [/^expired$/, "reasonExpired"],
  [/^channel_not_configured$/, "reasonNotConfigured"],
  [/^invalid_address$/, "reasonInvalidAddress"],
];

function skipReasonKey(reason: string | undefined): string {
  for (const [pattern, key] of SKIP_REASON_KEYS) {
    if (reason && pattern.test(reason)) return key;
  }
  return "reasonOther";
}

function sendLine(send: UnfinishedBookingRecoverySend): RecoveryLine {
  const channel = send.channel === "sms" ? "Sms" : "Email";
  switch (send.status) {
    case "sent":
      return send.sentAt
        ? { key: `recovery${channel}Sent`, when: send.sentAt }
        : { key: `recovery${channel}SentUndated` };
    case "skipped":
      return {
        key: `recovery${channel}Skipped`,
        reasonKey: skipReasonKey(send.skipReason),
      };
    case "failed":
      return { key: `recovery${channel}Failed` };
    default:
      return { key: `recovery${channel}Waiting` };
  }
}

function notSentKey(detail: string | undefined): string {
  if (!detail) return "recoveryNotSent";
  if (detail.includes("switched off")) return "recoveryOff";
  if (detail.includes("no email address")) return "recoveryNoEmail";
  if (detail.includes("no mobile number")) return "recoveryNoPhone";
  if (detail.includes("the template uses")) return "recoveryTemplate";
  return "recoveryNotSent";
}

export function recoveryLines(
  recovery: UnfinishedBookingRecovery | undefined,
): RecoveryLine[] {
  if (!recovery) return [{ key: "recoveryNotYet" }];
  if (recovery.outcome === "queued") {
    return recovery.sends.length > 0
      ? recovery.sends.map(sendLine)
      : [{ key: "recoveryQueued" }];
  }
  return [{ key: notSentKey(recovery.detail) }];
}
