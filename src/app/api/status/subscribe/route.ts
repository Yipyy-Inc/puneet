import { NextRequest, NextResponse } from "next/server";

import {
  buildStatusSubscribeEmail,
  buildStatusSubscribeSms,
} from "@/lib/status-subscribe-message";

// Public status-alert subscription. Env-gated like the other Yipyy send routes:
// when RESEND_API_KEY / Twilio creds are absent we don't fake a send — the
// subscription is accepted and we honestly report that confirmation delivery
// isn't enabled on this environment.

interface SubscribeBody {
  email?: string;
  phone?: string;
}

interface ChannelResult {
  sent: boolean;
  reason?: "not_configured" | "send_failed" | "error";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function sendEmail(email: string): Promise<ChannelResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: "not_configured" };
  const msg = buildStatusSubscribeEmail();
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Yipyy <onboarding@resend.dev>",
        to: email,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    });
    if (!res.ok) {
      console.error(
        "Status subscribe email failed:",
        res.status,
        await res.text(),
      );
      return { sent: false, reason: "send_failed" };
    }
    return { sent: true };
  } catch (error) {
    console.error("Status subscribe email error:", error);
    return { sent: false, reason: "error" };
  }
}

async function sendSms(phone: string): Promise<ChannelResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER ?? process.env.STATUS_SMS_FROM;
  if (!sid || !token || !from) return { sent: false, reason: "not_configured" };
  try {
    const params = new URLSearchParams({
      To: phone,
      From: from,
      Body: buildStatusSubscribeSms(),
    });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      },
    );
    if (!res.ok) {
      console.error(
        "Status subscribe SMS failed:",
        res.status,
        await res.text(),
      );
      return { sent: false, reason: "send_failed" };
    }
    return { sent: true };
  } catch (error) {
    console.error("Status subscribe SMS error:", error);
    return { sent: false, reason: "error" };
  }
}

export async function POST(req: NextRequest) {
  let body: SubscribeBody;
  try {
    body = (await req.json()) as SubscribeBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const email = body.email?.trim();
  const phone = body.phone?.trim();

  if (!email && !phone) {
    return NextResponse.json(
      { error: "Provide an email address or a mobile number." },
      { status: 400 },
    );
  }
  if (email && !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const emailResult = email ? await sendEmail(email) : null;
  const smsResult = phone ? await sendSms(phone) : null;

  return NextResponse.json({
    subscribed: true,
    email: emailResult,
    sms: smsResult,
    message: "You're subscribed to Yipyy status updates.",
  });
}
