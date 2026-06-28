import { NextResponse } from "next/server";

// Honest, env/URL-gated Slack webhook test. Performs a REAL POST to the Slack
// incoming-webhook URL the admin configured (or the SLACK_WEBHOOK_URL env var).
// Never fakes success — returns reason "not_configured" / "send_failed" when it
// can't actually deliver. Mirrors the env-gated honesty of /api/admin/invite.

type TestResult =
  | { sent: true; message: string }
  | { sent: false; reason: "not_configured" | "send_failed"; message: string };

const SLACK_HOST_PREFIX = "https://hooks.slack.com/";

export async function POST(req: Request) {
  let webhookUrl = "";
  try {
    const body = (await req.json()) as { webhookUrl?: string };
    webhookUrl = (body.webhookUrl ?? "").trim();
  } catch {
    // ignore — fall through to env / not_configured
  }

  if (!webhookUrl) {
    webhookUrl = (process.env.SLACK_WEBHOOK_URL ?? "").trim();
  }

  if (!webhookUrl || !webhookUrl.startsWith(SLACK_HOST_PREFIX)) {
    return NextResponse.json<TestResult>({
      sent: false,
      reason: "not_configured",
      message:
        "No valid Slack webhook configured. Paste an https://hooks.slack.com/… incoming-webhook URL (or set SLACK_WEBHOOK_URL).",
    });
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: ":white_check_mark: *Yipyy test alert* — your Slack notification channel is wired up correctly.",
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json<TestResult>({
        sent: false,
        reason: "send_failed",
        message: `Slack rejected the request (HTTP ${res.status}${
          detail ? `: ${detail.slice(0, 80)}` : ""
        }).`,
      });
    }

    return NextResponse.json<TestResult>({
      sent: true,
      message: "Test message delivered to Slack.",
    });
  } catch (err) {
    return NextResponse.json<TestResult>({
      sent: false,
      reason: "send_failed",
      message:
        err instanceof Error
          ? `Could not reach the Slack webhook: ${err.message}`
          : "Could not reach the Slack webhook.",
    });
  }
}
